// Serveur local du site Delphinium (développement uniquement, jamais publié).
// Lancer depuis le dossier html :  node tools/serveur-site.mjs   puis ouvrir http://localhost:5180
// Imite Netlify : URLs « jolies » (/contact/), page 404.html, en-têtes de _headers,
// et l'envoi du formulaire (POST) redirige vers /merci/ sans rien enregistrer.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = Number(process.env.PORT) || 5180;
const TYPES = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript', '.css':'text/css; charset=utf-8',
  '.json':'application/json', '.webmanifest':'application/manifest+json', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8',
  '.glb':'model/gltf-binary', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon',
  '.svg':'image/svg+xml', '.woff2':'font/woff2', '.hdr':'application/octet-stream'
};
const COMPRESSIBLE = new Set(['.html','.js','.mjs','.css','.json','.glb','.hdr','.svg','.xml','.txt','.webmanifest']);

// en-têtes globaux lus dans _headers (bloc « /* ») pour tester localement comme en production
function globalHeaders(){
  try{
    const txt = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8'), out = {};
    let on = false;
    for(const line of txt.split(/\r?\n/)){
      if(/^\S/.test(line)){ on = line.trim() === '/*'; continue; }
      const m = line.match(/^\s+([\w-]+):\s*(.+)$/);
      if(on && m && m[1].toLowerCase() !== 'strict-transport-security') out[m[1]] = m[2];
    }
    return out;
  }catch{ return {}; }
}

function send(req, res, file, status = 200){
  fs.readFile(file, (err, data) => {
    if(err){ res.writeHead(404); return res.end('404'); }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...globalHeaders() };
    if(COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')){ headers['Content-Encoding'] = 'gzip'; data = zlib.gzipSync(data, { level: 6 }); }
    res.writeHead(status, headers); res.end(data);
  });
}

http.createServer((req, res) => {
  // outil de dev : captures de la scène (site?debug) écrites dans le dossier temporaire
  if(req.method === 'POST' && req.url.startsWith('/__snap')){
    const name = (new URL(req.url, 'http://x').searchParams.get('n') || 'snap').replace(/[^\w-]/g, '');
    const dir = path.join(os.tmpdir(), 'delphinium-snaps'); fs.mkdirSync(dir, { recursive: true });
    const chunks = []; req.on('data', c => chunks.push(c));
    req.on('end', () => { fs.writeFileSync(path.join(dir, name + '.jpg'), Buffer.concat(chunks)); res.end(dir); });
    return;
  }
  if(req.method === 'POST'){ req.resume(); res.writeHead(303, { Location: '/merci/' }); return res.end(); }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if(p.split('/').some(seg => seg.startsWith('.') || seg === '_headers' || seg === '_redirects')){ return send(req, res, path.join(ROOT, '404.html'), 404); }
  if(p.endsWith('/')) p += 'index.html';
  let file = path.join(ROOT, p);
  if(!file.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if(!err && st.isDirectory()){ res.writeHead(301, { Location: p + '/' }); return res.end(); }
    if(err) return send(req, res, path.join(ROOT, '404.html'), 404);
    send(req, res, file);
  });
}).listen(PORT, () => console.log(`Site Delphinium : http://localhost:${PORT}`));
