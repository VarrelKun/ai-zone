const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Set up multer untuk penyimpanan sementara file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'tmp/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Buat folder tmp jika belum ada
if (!fs.existsSync('tmp')) {
  fs.mkdirSync('tmp');
}

// Middleware untuk menangani permintaan JSON dan form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route untuk halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/zoneimg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'zone.html'));
});

// Route untuk upload file
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = path.join(__dirname, 'tmp', req.file.filename);
  let catboxUrl = '';

  try {
    // Upload ke Catbox
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'fileupload');
    catboxForm.append('fileToUpload', fs.createReadStream(filePath));

    const catboxResponse = await axios.post('https://catbox.moe/user/api.php', catboxForm, {
      headers: catboxForm.getHeaders(),
    });

    // Hapus file setelah upload
    fs.unlinkSync(filePath);

    if (!catboxResponse.data || !catboxResponse.data.includes('http')) {
      throw new Error('Gagal meng-upload file ke Catbox.');
    }

    catboxUrl = catboxResponse.data.trim();
    console.log('URL dari Catbox:', catboxUrl);

    // Kirim URL Catbox ke API eksternal
    const enhanceUrl = `https://api.ryzendesu.vip/api/ai/remini?url=${encodeURIComponent(catboxUrl)}`;
    console.log('Mengirim permintaan ke API eksternal:', enhanceUrl);

    const enhanceResponse = await axios.get(enhanceUrl, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyApp/1.0)' },
      timeout: 70000, // Timeout 70 detik
    });

    // Mengirim gambar dalam bentuk base64
    const enhancedImageUrl = `data:image/jpeg;base64,${Buffer.from(enhanceResponse.data).toString('base64')}`;

    // Kirimkan hasil ke client
    res.json({
      success: true,
      enhancedImageUrl: enhancedImageUrl,
    });

  } catch (error) {
    console.error('Error saat memproses gambar:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memproses gambar.' });
  }
});

// Route untuk rzone, memanggil API eksternal "https://love.neekoi.me/kivotos?text="
app.get('/rzone', async (req, res) => {
  const text = req.query.text;

  if (!text) {
    return res.status(400).json({ success: false, message: 'Parameter "text" wajib disertakan.' });
  }

  try {
    // Kirim permintaan ke API eksternal dengan query "text"
    const response = await axios.get(`https://love.neekoi.me/kivotos?text=${encodeURIComponent(text)}`, {
      responseType: 'arraybuffer'  // Mengambil respons sebagai buffer gambar
    });

    // Set header untuk tipe konten gambar (image/jpeg)
    res.set('Content-Type', 'image/jpeg');

    // Kirimkan gambar langsung ke klien
    res.send(response.data);
    
  } catch (error) {
    console.error('Error saat memanggil API eksternal:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mendapatkan gambar dari API eksternal.' });
  }
});

// Jalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
