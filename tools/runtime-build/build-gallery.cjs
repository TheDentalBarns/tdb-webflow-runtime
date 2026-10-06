// Uses the pinned Terser dependency in this build package.
const fs=require('node:fs'),path=require('node:path');
const terser=require(process.env.TDB_TERSER_MODULE||'terser');
(async()=>{
 const root=path.resolve(__dirname,'../..');
 const source=fs.readFileSync(path.join(root,'src/smile-gallery/gallery-page.js'),'utf8');
 const output=(await terser.minify(source,{compress:true,mangle:true,format:{comments:/^ TDB Smile Gallery/}})).code+'\n';
 const target=path.join(root,'dist/tdb-smile-gallery.min.js');
 if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Smile Gallery build is stale');}
 else fs.writeFileSync(target,output);
 console.log('Smile Gallery minified artifact: '+Buffer.byteLength(output)+' bytes');
})().catch(error=>{console.error(error);process.exitCode=1;});
