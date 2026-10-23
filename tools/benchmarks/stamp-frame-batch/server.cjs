const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const baselineSha = 'd4f0f789d94e57c294d7ef25c9e2926089c58a8f';
const baseline = cp.execFileSync(
  'git',
  [
    '-c',
    'safe.directory=' + root.replaceAll('\\', '/'),
    'show',
    baselineSha + ':src/sliders/treatment-stamps.js',
  ],
  { cwd: root },
);
const routes = {
  '/': ['index.html', 'text/html'],
  '/fixture.html': ['fixture.html', 'text/html'],
  '/candidate.js': [path.join(root, 'src/sliders/treatment-stamps.js'), 'text/javascript'],
};
http
  .createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    res.setHeader('Cache-Control', 'no-store');
    if (pathname === '/baseline.js') {
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(baseline);
    }
    const route = routes[pathname];
    if (!route) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.setHeader('Content-Type', route[1]);
    res.end(fs.readFileSync(path.resolve(__dirname, route[0])));
  })
  .listen(8768, '127.0.0.1', () =>
    console.log('Stamp A/B harness: http://127.0.0.1:8768/ (baseline ' + baselineSha + ')'),
  );
