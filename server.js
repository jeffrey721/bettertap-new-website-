/* Better Tap — tiny zero-dependency static server.
   Usage: node server.js [port] [rootDir]
   Used for the LOCAL development environment. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2], 10) || 4321;
const root = path.resolve(process.argv[3] || __dirname);
const label = process.env.ENV_LABEL || 'local';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.pdf': 'application/pdf'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  let filePath = path.join(root, urlPath);
  // prevent path traversal
  if (!filePath.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (err2, data) => {
      if (err2) { res.writeHead(404, {'Content-Type':'text/html'}); return res.end('<h1>404</h1><p>'+urlPath+'</p>'); }
      res.writeHead(200, {'Content-Type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'});
      res.end(data);
    });
  });
}).listen(port, () => {
  console.log(`[${label}] Better Tap serving ${root}`);
  console.log(`[${label}] → http://localhost:${port}`);
});
