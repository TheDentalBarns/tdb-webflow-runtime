import { mkdir, stat, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, 'src/tdb-swiper-8.4.7.js');
const outfile = resolve(here, '../../dist/tdb-swiper-8.4.7.min.js');

await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2017'],
  legalComments: 'inline',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Ship the shared TDB adapter in the same request as the engine.
  footer: { js: (await readFile(resolve(here, '../../src/sliders/swiper-behaviour.js'), 'utf8')).replace('/* TDB_SWIPER_PLUGINS */',
    (await readFile(resolve(here, '../../src/sliders/swiper-duration.js'), 'utf8')) + '\n' +
    (await readFile(resolve(here, '../../src/sliders/swiper-plugins.js'), 'utf8'))) },
  banner: {
    js: '/*! TDB custom Swiper 8.4.7-tdb.2 | CVE-2026-27212 backport | Core + A11y, Autoplay, Keyboard, Navigation, Pagination, Parallax | Swiper MIT License */',
  },
});

const { size } = await stat(outfile);
console.log(`Built ${outfile} (${size.toLocaleString()} bytes)`);
