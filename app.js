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
    const enhanceUrl = `https://api.ryzendesu.vip/api/ai/remini?url=${encodeURIComponent(catboxUrl)}`;
    const enhanceResponse = await axios.get(enhanceUrl, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 70000,
    });

    const enhancedImageUrl = `data:image/jpeg;base64,${Buffer.from(enhanceResponse.data).toString('base64')}`;

    res.json({ success: true, enhancedImageUrl: enhancedImageUrl });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memproses gambar.' });
  }
});

// Endpoint untuk memanggil API eksternal
app.get('/rzone', async (req, res) => {
  const text = req.query.text;

  if (!text) {
    return res.status(400).json({ success: false, message: 'Parameter "text" wajib disertakan.' });
  }

  try {
    console.log(`Mengirim permintaan ke API eksternal dengan text: ${text}`);
    const response = await axios.get(`https://love.neekoi.me/kivotos`, {
      params: { text }, // Kirim parameter `text`
      responseType: 'arraybuffer',
      timeout: 100000, // Timeout 100 detik
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    res.set('Content-Type', 'image/jpeg');
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
