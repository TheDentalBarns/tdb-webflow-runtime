const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
function fixture(){
 const dom=new JSDOM('<p data-tdb-dd-text>Remember this</p><div data-tdb-page-break><img src="image.webp"></div>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.performance.getEntriesByType=()=>[{type:'reload'}];return w;
}
test('external motion entry installs one policy and preserves reload memory',()=>{
 const w=fixture();try{
  const code=read('dist/tdb-motion.js');w.eval(code);
  const motion=w.TDBMotion;assert.equal(motion.version,'1.19.6');assert.equal(w.TDBMotionPolicy.mode,'full');
  const text=w.document.querySelector('p'),wrapper=w.document.querySelector('[data-tdb-page-break]'),image=wrapper.querySelector('img');
  w.TDBDDMemory.save([{owner:{},node:text,value:.4}]);
  w.TDBPageBreakMemory.save([{wrapper,node:image,y:5,alpha:.5}]);
  delete w.TDBDDMemory;delete w.TDBPageBreakMemory;
  w.eval(code);
  assert.equal(w.TDBMotion,motion,'repeat inclusion preserves shared runtime instance');
  assert.equal(text.style.opacity,'0.4');assert.equal(w.TDBDDMemory.take(text),true);
  assert.equal(image.style.transform,'translate3d(0, 5.0000px, 0)');
  assert.ok(w.TDBPageBreakMemory.take(image));
 }finally{w.close();}
});
test('external Brevo integration remains consent gated and deduplicates SDK startup',()=>{
 const w=fixture();try{
  let state={action:'reject',categories:[]};w.CookieScript={instance:{currentState:()=>state}};
  const code=read('dist/tdb-brevo-consent.min.js');w.eval(code);
  assert.equal(w.document.querySelectorAll('script[data-tdb-brevo-js]').length,0);
  state={action:'accept',categories:['functionality']};w.dispatchEvent(new w.Event('CookieScriptAccept'));
  assert.equal(w.document.querySelectorAll('script[data-tdb-brevo-js]').length,0);
  state={action:'accept',categories:['targeting']};w.dispatchEvent(new w.Event('CookieScriptAcceptAll'));
  w.dispatchEvent(new w.Event('CookieScriptLoaded'));w.eval(code);
  assert.equal(w.document.querySelectorAll('script[data-tdb-brevo-js]').length,1);
  assert.equal(w.Brevo.filter(x=>Array.isArray(x)&&x[0]==='init').length,1);
  w.document.cookie='sib_cuid=test; Path=/';state={action:'reject',categories:[]};w.dispatchEvent(new w.Event('CookieScriptReject'));
  assert.equal(w.TDBBrevoConsent.status().state,'blocked');assert.equal(w.document.cookie.includes('sib_cuid'),false);
 }finally{w.close();}
});
