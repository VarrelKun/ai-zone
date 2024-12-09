const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const port = 3000;

// Setup Multer untuk file upload
const upload = multer({ storage: multer.memoryStorage() });

// Middleware untuk menangani permintaan JSON dan form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve halaman HTML (pastikan file public/index.html ada)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/zoneimg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'zone.html'));
});

// Endpoint untuk file upload dan memproses gambar
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // Upload ke Catbox
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'fileupload');
    catboxForm.append('fileToUpload', req.file.buffer, req.file.originalname);

    const catboxResponse = await axios.post('https://catbox.moe/user/api.php', catboxForm, {
      headers: catboxForm.getHeaders(),
    });

    if (!catboxResponse.data || !catboxResponse.data.includes('http')) {
      throw new Error('Gagal upload ke Catbox.');
    }

    const catboxUrl = catboxResponse.data.trim();
    console.log('URL dari Catbox:', catboxUrl);

    // Panggil API eksternal
    const enhanceUrl = `https://skizoasia.xyz/api/remini?apikey=isaac&url=${encodeURIComponent(catboxUrl)}`;
    console.log('Mengirim permintaan ke API eksternal:', enhanceUrl);

    const enhanceResponse = await axios.get(enhanceUrl, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyApp/1.0)' },
      timeout: 300000, // Timeout 300 detik untuk API eksternal
    });

    // Pastikan API eksternal mengembalikan gambar
    if (!enhanceResponse.data || !Buffer.isBuffer(enhanceResponse.data)) {
      throw new Error('Gagal menerima gambar dari API eksternal.');
    }

    // Mengirim gambar dalam bentuk base64
    const enhancedImageUrl = `data:image/jpeg;base64,${Buffer.from(enhanceResponse.data).toString('base64')}`;

    // Kirimkan hasil ke client
    res.json({
      success: true,
      enhancedImageUrl: enhancedImageUrl,
    });

  } catch (error) {
    console.error('Error saat memproses gambar:', error.message);

    // Menangani kesalahan berdasarkan status code dari API eksternal atau kesalahan DNS
    if (error.code === 'ENOTFOUND') {
      return res.status(500).json({ success: false, message: 'API eksternal tidak ditemukan. Pastikan domain tersedia.' });
    }

    if (error.response) {
      // Jika ada response dari server API eksternal
      console.error('Status Code dari API eksternal:', error.response.status);
      if (error.response.status === 502) {
        return res.status(502).json({ success: false, message: 'Server eksternal tidak dapat diproses. Coba lagi nanti.' });
      }
      // Penanganan untuk status error lain dari API eksternal
      return res.status(error.response.status).json({ success: false, message: `Error API eksternal: ${error.response.statusText}` });
    }

    // Jika bukan error dari respons server eksternal, error lainnya
    res.status(500).json({ success: false, message: 'Gagal memproses gambar.' });
  }
});

// Endpoint untuk memanggil API eksternal
app.get('/rzone', async (req, res) => {
  const { prompt, style } = req.query;

  // Pastikan kedua parameter ada
  if (!prompt || !style) {
    return res.status(400).json({ 
      success: false, 
      message: 'Parameter "prompt" dan "style" wajib disertakan.' 
    });
  }

  try {
    // Kirim permintaan ke API eksternal dengan query "prompt" dan "style"
    const response = await axios.get('https://api.ryzendesu.vip/api/ai/waifu-diff', {
      params: {
        prompt: prompt,
        style: style
      },
      responseType: 'arraybuffer' // Mengambil respons sebagai buffer gambar
    });

    // Set header untuk tipe konten gambar (image/jpeg)
    res.set('Content-Type', 'image/jpeg');

    // Kirimkan gambar langsung ke klien
    res.send(response.data);
  } catch (error) {
    console.error('Error saat memanggil API eksternal:', error.message);
    if (error.response) {
      console.error('Status API eksternal:', error.response.status);
      console.error('Data API eksternal:', error.response.data);
    }
    res.status(500).json({ success: false, message: 'Gagal mendapatkan gambar dari API eksternal.' });
  }
});

// Jalankan server (untuk lokal)
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
  });
}

// Ekspor app untuk Vercel
module.exports = app;
