#!/usr/bin/env node
/**
 * Yerel gelistirme sunucusu (bagimliliksiz).
 * bundle.json'in gercekten cekilebildigini gormek icin gerekir;
 * file:// uzerinde fetch calismaz.
 *
 *   npm run serve  ->  http://localhost:4173
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/paths.mjs';

const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.join(ROOT, relative);

  // Dizin disina cikisi engelle.
  if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { res.writeHead(404).end('Not found'); return; }

  res.writeHead(200, {
    'content-type': TYPES[path.extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT}  (Ctrl+C ile durdurun)`);
});
