const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const z = require('node:zlib');
const baseline = '31d0ee555c3136f447496cd77e4698333867f433';
function sizes(bytes) {
  return {raw:bytes.length, gzip:z.gzipSync(bytes,{level:9}).length,
    brotli:z.brotliCompressSync(bytes,{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}}).length};
}
const assets = ['dist/tdb-consent.js', 'dist/tdb-quote-carousel.min.js'];
const result = assets.map(file=>({file,before:sizes(execFileSync('git',['show',baseline+':'+file])),after:sizes(fs.readFileSync(file))}));
const [consent, quote] = result;
result.push({file:'Initial consent + eager quote versus consent-only (sum of independent artifacts)',
  before:Object.fromEntries(Object.keys(consent.before).map(k=>[k,consent.before[k]+quote.before[k]])),after:consent.after});
console.log(JSON.stringify(result,null,2));
