/* 仅用于本地查看改版预览的静态服务器（只读，端口 8899） */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '_preview');
const PUB = path.join(__dirname, 'edu-manage', 'public');
const PORT = 8899;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/预览.html';

  const candidates = [path.join(ROOT, rel), path.join(PUB, rel)];
  for (const file of candidates) {
    if (!file.startsWith(ROOT) && !file.startsWith(PUB)) continue;   // 防目录穿越
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(file).pipe(res);
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 ' + rel);
}).listen(PORT, '127.0.0.1', () => {
  console.log('预览服务器已启动: http://127.0.0.1:' + PORT + '/');
  console.log('  预览器   : http://127.0.0.1:' + PORT + '/预览.html');
  console.log('  改动前   : http://127.0.0.1:' + PORT + '/home-before.html  |  /about-before.html');
  console.log('  改动后   : http://127.0.0.1:' + PORT + '/home-after.html   |  /about-after.html');
});
