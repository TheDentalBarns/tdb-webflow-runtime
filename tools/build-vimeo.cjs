/* Run after npm install --no-save terser@5.44.0; --check verifies committed assets. */
const fs=require('node:fs'),path=require('node:path');
const {build}=require('./runtime-build/build-preservation.cjs');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check');
(async()=>{
 for(const [src,dst] of [['src/components/vimeo.js','dist/tdb-vimeo.js'],['src/loaders/vimeo-loader.js','dist/tdb-vimeo-loader.js'],['src/styles/tdb-vimeo-ui.css','dist/tdb-vimeo.css']]){
  const requested=process.argv.slice(2).filter(arg=>arg!=='--check');
  if(requested.length&&!requested.includes(dst))continue;
  const input=fs.readFileSync(path.join(root,src),'utf8');
  const output=src.endsWith('.js')?await build(dst):new (require('clean-css'))({level:0,rebase:false}).minify(input.replace(/\/\*[\s\S]*?\*\//g,'')).styles+'\n';
  const file=path.join(root,dst);
  if(check){if(fs.readFileSync(file,'utf8')!==output)throw Error(dst+' is stale');}
  else fs.writeFileSync(file,output);
  console.log((check?'Checked ':'Built ')+dst+' ('+Buffer.byteLength(output)+' bytes)');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
