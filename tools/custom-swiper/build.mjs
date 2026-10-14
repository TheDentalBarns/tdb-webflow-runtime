import { mkdir, stat, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, 'src/tdb-swiper-8.4.7.js');
const outfile = resolve(here, '../../dist/tdb-swiper-8.4.7.min.js');
const adapter = (await readFile(resolve(here, '../../src/sliders/swiper-behaviour.js'), 'utf8')).replace('/* TDB_SWIPER_PLUGINS */',
  (await Promise.all(['swiper-entry', 'swiper-gap', 'swiper-duration', 'swiper-plugins'].map(name =>
    readFile(resolve(here, '../../src/sliders/' + name + '.js'), 'utf8')))).join('\n'));
const footer = await transform((await readFile(resolve(here, '../../src/shared/carousel-visibility.js'), 'utf8')) + '\n' + adapter,
  {minify:true,target:'es2017',legalComments:'inline'});

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
  footer: { js: footer.code },
  banner: {
    js: '/*! TDB custom Swiper 8.4.7-tdb.2 | CVE-2026-27212 backport | Core + A11y, Autoplay, Keyboard, Navigation, Pagination, Parallax | Swiper MIT License */',
  },
});

const { size } = await stat(outfile);
console.log(`Built ${outfile} (${size.toLocaleString()} bytes)`);
