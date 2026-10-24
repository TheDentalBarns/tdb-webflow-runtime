const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const baseline = cp.execFileSync(
  'git',
  [
    '-c',
    'safe.directory=' + root.replaceAll('\\', '/'),
    'show',
    '3c3e254f2d77dbfbe473234f90b8be214c774cf8:src/sliders/parallax-progress.js',
  ],
  { cwd: root },
);
const files = {
  '/': path.join(__dirname, 'index.html'),
  '/fixture.html': path.join(__dirname, 'fixture.html'),
  '/candidate.js': path.join(root, 'src/sliders/parallax-progress.js'),
  '/sampler.js': path.join(root, 'src/shared/rendered-progress.js'),
  '/details.js': path.join(root, 'src/sliders/treatment-details.js'),
};
http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript' : 'text/html');
    if (url.pathname === '/baseline.js') return res.end(baseline);
    if (!files[url.pathname]) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.end(fs.readFileSync(files[url.pathname]));
  })
  .listen(8771, '127.0.0.1', () => console.log('Native progress A/B: http://127.0.0.1:8771/'));
