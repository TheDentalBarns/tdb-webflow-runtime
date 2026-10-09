// npm ci --prefix tools/runtime-build; node tools/build-instagram.mjs [--check]
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {minify}=require(process.env.TDB_TERSER_MODULE||'./runtime-build/node_modules/terser');
const root=new URL('../',import.meta.url);
const source=await readFile(new URL('src/instagram/native.js',root),'utf8');
const minified=(await minify(source,{compress:true,mangle:true,format:{comments:/^ TDB native Instagram/}})).code+'\n';
for(const [path,content] of [['dist/tdb-instagram-native.js',source],['dist/tdb-instagram-native.min.js',minified]]){
  const file=new URL(path,root);
  if(process.argv.includes('--check')){
    if(await readFile(file,'utf8')!==content)throw Error(fileURLToPath(file)+' is stale');
  }else await writeFile(file,content);
}
console.log('Instagram runtime: '+Buffer.byteLength(source)+' source bytes, '+Buffer.byteLength(minified)+' minified bytes.');
