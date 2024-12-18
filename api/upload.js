const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware untuk menangani permintaan JSON dan form-data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route untuk upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  let catboxUrl = '';
  try {
    // Upload file ke Catbox
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'fileupload');
    catboxForm.append('fileToUpload', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const catboxResponse = await axios.post('https://catbox.moe/user/api.php', catboxForm, {
      headers: catboxForm.getHeaders(),
    });

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

    res.json({
      success: true,
      enhancedImageUrl: enhancedImageUrl,
    });

  } catch (error) {
    console.error('Error saat memproses gambar:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memproses gambar.' });
  }
});

module.exports = app;
