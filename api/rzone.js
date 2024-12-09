const express = require('express');
const axios = require('axios');

const app = express();

app.get('/api/rzone', async (req, res) => {
  const text = req.query.text;

  if (!text) {
    return res.status(400).json({ success: false, message: 'Parameter "text" wajib disertakan.' });
  }

  try {
    const response = await axios.get(`https://love.neekoi.me/kivotos?text=${encodeURIComponent(text)}`, {
      responseType: 'arraybuffer',
    });

    res.set('Content-Type', 'image/jpeg');
    res.send(response.data);

  } catch (error) {
    console.error('Error saat memanggil API eksternal:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mendapatkan gambar dari API eksternal.' });
  }
});

module.exports = app;
