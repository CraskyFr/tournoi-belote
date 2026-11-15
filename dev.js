// Essai en local, sans Vercel : `node dev.js` puis http://localhost:3000
// Les données vont dans .donnees-locales.json ; le code organisateur est 1234 (ou la variable ADMIN_CODE).
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml' };
const routes = { state: require('./api/state'), score: require('./api/score'), admin: require('./api/admin') };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const m = u.pathname.match(/^\/api\/(\w+)$/);
  if (m && routes[m[1]]) {
    let corps = '';
    req.on('data', d => { corps += d; });
    req.on('end', () => {
      try { req.body = corps ? JSON.parse(corps) : {}; } catch { req.body = {}; }
      req.query = Object.fromEntries(u.searchParams);
      res.status = c => { res.statusCode = c; return res; };
      res.json = o => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
      routes[m[1]](req, res);
    });
    return;
  }
  const f = path.join(__dirname, 'public', u.pathname === '/' ? 'index.html' : path.normalize(u.pathname));
  if (!f.startsWith(path.join(__dirname, 'public'))) { res.statusCode = 403; return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.statusCode = 404; return res.end('Introuvable'); }
    res.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
    res.end(d);
  });
}).listen(process.env.PORT || 3000, () => console.log('Tournoi : http://localhost:' + (process.env.PORT || 3000)));
