const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../src/reviews/native/quotes.js','utf8');
const body=source.slice(source.indexOf('const assets='),source.indexOf('function mount'));
const platforms=['Google','Facebook','Yell','Doctify'];
function reader(native){return vm.runInNewContext(body+';platformAsset',{document:{querySelectorAll:()=>platforms.map(platform=>({dataset:{tdbReviewIcon:platform},querySelector:q=>q===(native?'img':'image')?{getAttribute:key=>key===(native?'src':'href')?'https://artwork.test/'+platform+'.svg':null}:null}))}});}
test('all provider assets resolve identically through image and legacy SVG templates',()=>{const old=reader(false),next=reader(true);for(const p of platforms)assert.equal(next(p),old(p));});
test('unknown providers preserve the empty artwork fallback',()=>{assert.equal(reader(true)('Unknown'),'');assert.equal(reader(false)('Unknown'),'');});
