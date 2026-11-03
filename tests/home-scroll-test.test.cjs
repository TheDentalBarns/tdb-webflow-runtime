const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('src/runtime/home-scroll-test.js','utf8');
function setup(url='https://dentalbarns.webflow.io/?tdb-scroll-test=1'){
 const dom=new JSDOM('<div data-tdb-smile-placeholder="home"></div>',{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let clock=0,calls=0;
 w.performance.now=()=>clock;w.scrollY=8000;
 Object.defineProperty(w.document.documentElement,'scrollHeight',{value:31000});
 const move=(y)=>{w.scrollY=y;w.dispatchEvent(new w.Event('scroll'))};
 w.scrollTo=function(x,y){calls++;move(y)};
 const original=w.scrollTo,focus=w.HTMLElement.prototype.focus;
 w.eval(source);const owner=w.createHomeScrollTest();
 return{w,owner,original,focus,move,advance(ms){clock+=ms},calls:()=>calls,report:()=>JSON.parse(w.sessionStorage.getItem('tdb-home-scroll-test-v1')),close(){owner?.destroy();w.close()}};
}
test('normal and production visits create no diagnostic UI, storage or wrappers',()=>{
 for(const url of ['https://dentalbarns.webflow.io/','https://thedentalbarns.com/?tdb-scroll-test=1']){
  const f=setup(url);try{assert.equal(f.owner,null);assert.equal(f.w.scrollTo,f.original);assert.equal(f.w.HTMLElement.prototype.focus,f.focus);assert.equal(f.w.sessionStorage.length,0);assert(!f.w.document.querySelector('.tdb-scroll-test'));}finally{f.close()}
 }
});
test('diagnostic distinguishes script calls from native top arrivals without correcting scroll',()=>{
 const f=setup();try{
  f.w.scrollTo(0,0);assert.equal(f.calls(),1);assert.equal(f.report().topReturn.from,8000);
  assert.equal(f.report().topReturn.commands[0].kind,'scrollTo');
  f.advance(2000);f.move(9000);f.move(0);
  assert.equal(f.calls(),1);assert.equal(f.report().topReturn.commands.length,0);
  assert.deepEqual(f.report().topReturn.documentHeight,[31000,31000]);
  f.owner.destroy();assert.equal(f.w.scrollTo,f.original);assert.equal(f.w.HTMLElement.prototype.focus,f.focus);
  assert(!f.w.document.querySelector('.tdb-scroll-test'));
  const again=f.w.createHomeScrollTest();assert.equal(f.report().loads,2);assert.equal(f.report().previousTopReturn.from,9000);again.destroy();
 }finally{f.close()}
});
