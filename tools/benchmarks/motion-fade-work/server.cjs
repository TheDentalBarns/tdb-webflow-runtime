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
    '0ee86b04516f1327d0fa4e8041200a31ed63650f:src/shared/motion.js',
  ],
  { cwd: root },
);
const files = {
  '/': path.join(__dirname, 'index.html'),
  '/fixture.html': path.join(__dirname, 'fixture.html'),
  '/audit.js': path.join(__dirname, 'audit.js'),
  '/candidate.js': path.join(root, 'src/shared/motion.js'),
};
http
  .createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : 'text/html');
    if (pathname === '/baseline.js') return res.end(baseline);
    if (!files[pathname]) {
      res.writeHead(404);
      return res.end();
    }
    res.end(fs.readFileSync(files[pathname]));
  })
  .listen(8772, '127.0.0.1', () => console.log('Motion fade A/B: http://127.0.0.1:8772/'));
