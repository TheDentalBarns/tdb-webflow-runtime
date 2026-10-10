// Reproduce the published gallery bundle while keeping source files editable.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {minify}=require('./runtime-build/node_modules/terser');
const root=new URL('../',import.meta.url);
const source=(await Promise.all(['src/sliders/gallery-presentation.js','src/sliders/gallery-plugin.js'].map(p=>readFile(new URL(p,root),'utf8')))).join('\n');
const output=(await minify(source,{compress:true,mangle:true,format:{comments:false}})).code+'\n';
const target=new URL('dist/tdb-gallery.js',root);
if(process.argv.includes('--check')){
  if(await readFile(target,'utf8')!==output)throw Error('Gallery bundle is stale');
}else await writeFile(target,output);
console.log('Gallery bundle: '+Buffer.byteLength(output)+' bytes');
