const axios = require('axios');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const FormData = require('form-data');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/');
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

// Fungsi untuk menangani permintaan
module.exports.handler = async (event, context) => {
  // Pilih endpoint berdasarkan path
  const { path } = event;

  if (path === "/") {
    // Serve halaman HTML (pastikan file public/index.html ada)
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    return {
      statusCode: 200,
      body: fs.readFileSync(indexPath, 'utf-8'),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  }

  if (path === "/zoneimg") {
    const zonePath = path.join(__dirname, '..', 'public', 'zone.html');
    return {
      statusCode: 200,
      body: fs.readFileSync(zonePath, 'utf-8'),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  }

  // Endpoint untuk memanggil API eksternal
  if (path === "/rzone") {
    const queryString = event.queryStringParameters;
    const text = queryString.text;

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Parameter "text" wajib disertakan.' }),
      };
    }

    try {
      console.log(`Mengirim permintaan ke API eksternal dengan text: ${text}`);
      const response = await axios.get(`https://love.neekoi.me/kivotos`, {
        params: { text },
        responseType: 'arraybuffer',
        timeout: 100000, // Timeout 100 detik
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/jpeg',
        },
        body: response.data.toString('base64'),
        isBase64Encoded: true, // Mengindikasikan bahwa konten berupa base64
      };
    } catch (error) {
      console.error('Error saat memanggil API eksternal:', error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Gagal mendapatkan gambar dari API eksternal.' }),
      };
    }
  }

  // Default response jika endpoint tidak dikenali
  return {
    statusCode: 404,
    body: JSON.stringify({ success: false, message: 'Endpoint tidak ditemukan' }),
  };
};
