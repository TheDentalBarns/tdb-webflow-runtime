// Build only drawer-related artifacts; preserve independently released modules.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {minify} = require(process.env.TDB_TERSER_MODULE || './runtime-build/node_modules/terser');
const root = new URL('../', import.meta.url);
const entries = {
  'tdb-drawer.js': ['src/shared/scroll-lock.js','src/shared/site-chrome.js','src/shared/carousel-visibility.js','src/shared/carousel-controls.js','src/shared/drawer-reading.js','src/shared/drawer.js'],
  'tdb-modules.js': ['src/shared/modules.js'],
  'tdb-usp-drawer.js': ['src/usp/drawer.js'],
  'tdb-reviews.js': ['src/reviews/native/drawer-content.js'],
  'tdb-reviews-loader.js': ['src/reviews/native/loader.js'],
  'tdb-review-introduction.js': ['src/reviews/native/introduction.js'],
  'tdb-review-cards.js': ['src/reviews/native/cards.js'],
};
for (const [artifact, sources] of Object.entries(entries)) {
  const source = (await Promise.all(sources.map(path => readFile(new URL(path,root),'utf8')))).join('\n');
  const code = (await minify(source,{compress:true,mangle:true,format:{comments:/^ (TDB|Shared)/}})).code+'\n';
  const file = new URL('dist/'+artifact,root);
  if(process.argv.includes('--check')) {
    if(await readFile(file,'utf8')!==code) throw Error(artifact+' differs from source');
  } else await writeFile(file,code);
}
console.log('Drawer artifacts '+(process.argv.includes('--check')?'checked':'built')+'.');
