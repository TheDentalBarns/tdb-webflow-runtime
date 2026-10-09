// Build the small review-specific adapter; the carousel engine is shared.
const fs=require('node:fs'),path=require('node:path');
const terser=require(process.env.TDB_TERSER_MODULE||'terser');
(async()=>{
 const root=path.resolve(__dirname,'../..');
 const source=fs.readFileSync(path.join(root,'src/reviews/native/quotes.js'),'utf8');
 const output=(await terser.minify(source,{compress:true,mangle:true,format:{comments:false}})).code+'\n';
 const target=path.join(root,'dist/tdb-review-quote-adapter.min.js');
 if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==output)throw Error('Review quote adapter build is stale');}
 else fs.writeFileSync(target,output);
 console.log('Review quote adapter: '+Buffer.byteLength(output)+' bytes');
})().catch(error=>{console.error(error);process.exitCode=1;});
