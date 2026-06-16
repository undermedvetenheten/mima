const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png',
    '.ico': 'image/x-icon', '.json': 'application/json',
};

http.createServer((req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const file = path.join(__dirname, decodeURIComponent(urlPath));
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
    });
}).listen(PORT, () => console.log(`Mima → http://localhost:${PORT}`));
