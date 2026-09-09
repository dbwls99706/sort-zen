/* Serve the production web export locally, including direct Expo Router routes. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist-web');
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const hostIndex = args.indexOf('--host');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 4173;
const host = hostIndex >= 0 ? args[hostIndex + 1] : '127.0.0.1';
if (!fs.existsSync(path.join(root, 'index.html'))) {
  throw new Error('Run pnpm export:web before pnpm dev.');
}
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm',
};
http
  .createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (url.pathname === '/__preview/phone') {
      const width = Math.max(280, Math.min(1200, Number(url.searchParams.get('width')) || 390));
      const height = Math.max(320, Math.min(1200, Number(url.searchParams.get('height')) || 844));
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      res.end(
        `<html><head><title>Sort ZEN mobile preview</title></head><body style="margin:0;background:#dde3e0;display:grid;place-items:center;min-height:100vh"><iframe title="Sort ZEN" src="/" style="border:0;width:${width}px;height:${height}px;background:white"></iframe></body></html>`,
      );
      return;
    }
    let relative;
    try {
      relative = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    let file = path.resolve(root, '.' + relative);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = path.join(root, 'index.html');
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, host, () => console.log(`Sort ZEN preview ready on port ${port}`));
