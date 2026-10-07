const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup(desktop=true){
 const native=read('docs/smile-gallery/native-templates.html');
 const cases=Array.from({length:26},(_,i)=>{const n=25-i;const names=n%2?['Composite Bonding']:['Invisalign','Whitening'];return '<div class="w-dyn-item"><details data-tdb-sg-case><summary data-tdb-sg-open><div data-tdb-sg-pair><div data-tdb-sg-crop="before"><img src="https://example.test/case-'+n+'.webp" alt="Case '+n+'"></div></div>'+read('docs/smile-gallery/native-card-strip.html')+'</summary><div data-tdb-sg-dialog><h2 data-tdb-sg-title>Case '+n+'</h2><p data-tdb-sg-description>Description '+n+'</p><span data-tdb-sg-price-value>From £'+(1000+n*100).toLocaleString('en-GB')+'</span><span data-tdb-sg-duration-value>'+n+' weeks</span><span data-tdb-sg-clinician-value>'+ (n%3?'Dr A':'Dr B')+'</span>'+names.map(name=>'<span data-tdb-sg-treatment-name>'+name+'</span>').join('')+'</div></details></div>';}).join('');
 const dom=new JSDOM('<main><section data-tdb-sg><div data-toolbar></div><div data-tdb-sg-list><div class="w-dyn-items">'+cases+'</div></div><div class="tdb-sg-empty" hidden><button class="tdb-sg-reset">Clear filters</button></div><div class="tdb-sg-more-wrap"><div><button data-tdb-sg-more>Show more</button></div></div></section></main>'+native,{url:'https://dentalbarns.webflow.io/smile-gallery',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,errors=[];w.console.error=(...args)=>errors.push(args);
 const toolbar=w.document.querySelector('[data-tdb-sg-native-toolbar]');w.document.querySelector('[data-toolbar]').replaceWith(toolbar);
 w.matchMedia=query=>({matches:query.includes('min-width')?desktop:false,addEventListener(){},removeEventListener(){}});
 w.IntersectionObserver=class{observe(){}disconnect(){}};w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
 w.DOMMatrixReadOnly=class{constructor(value=''){this.m41=Number(/translate(?:3d|X)?\(([-\d.]+)/.exec(value)?.[1]||0);this.m42=0;this.a=1;this.b=0;}};
 w.scrollTo=()=>{};
 w.Element.prototype.getClientRects=function(){return this.closest('[hidden]')?[]:[this.getBoundingClientRect()];};
 w.Element.prototype.getBoundingClientRect=function(){return {x:0,y:0,left:0,top:this.classList.contains('tdb-sg-filter-anchor')?-300:0,right:400,bottom:600,width:400,height:600};};
 w.Element.prototype.animate=function(){const a={cancel(){},onfinish:null,finished:Promise.resolve(),effect:{target:this}};queueMicrotask(()=>a.onfinish?.());return a;};
 w.TDBModules={load:()=>Promise.resolve()};
 for(const p of ['src/shared/motion.js','src/shared/ticker.js','src/shared/filters.js','src/smile-gallery/gallery-page.js'])w.eval(read(p));
 await w.TDBSmileGallery.mount();await pause(30);
 assert.deepEqual(errors,[]);
 return{dom,w,root:w.document.querySelector('[data-tdb-sg]'),toolbar,errors};
}
const visible=w=>[...w.document.querySelectorAll('[data-tdb-sg-case]')].filter(n=>!n.closest('.w-dyn-item').hidden);
test('full Gallery retains numeric sorting, 12-case batches, AND filters and clinician filtering',async()=>{
 const{dom,w,toolbar}=await setup();try{
  assert.equal(visible(w).length,12);assert.equal(visible(w)[0].querySelector('[data-tdb-sg-title]').textContent,'Case 0');
  assert.equal(w.document.querySelector('[data-tdb-sg-native-strip] [data-tdb-sg-display="price"]').textContent,'From £1,000');
  w.document.querySelector('[data-tdb-sg-more]').click();await pause(10);assert.equal(visible(w).length,24);
  w.document.querySelector('[data-tdb-sg-more]').click();await pause(10);assert.equal(visible(w).length,26);assert.ok(w.document.querySelector('[data-tdb-sg-more]').hidden);
  const choose=value=>toolbar.querySelector('.tdb-sg-inline-filter-group [data-filter-value="'+value+'"]').click();
  choose('clear-aligners-invisalign');choose('whitening');assert.equal(toolbar.querySelector('.tdb-sg-status').textContent,'13 smiles');assert.equal(visible(w).length,12);
  assert.ok(toolbar.querySelector('.tdb-sg-inline-filter-group [data-filter-value="composite-bonding"]').disabled);
  choose('Dr B');assert.equal(visible(w).length,5);assert.equal(toolbar.querySelector('.tdb-sg-status').textContent,'5 smiles');
  choose('all');assert.equal(visible(w).length,12);assert.equal(toolbar.querySelector('.tdb-sg-status').textContent,'26 smiles');
  await w.TDBSmileGallery.mount();assert.equal(w.document.querySelectorAll('[data-tdb-sg-native-overlay]').length,1);assert.equal(toolbar.querySelectorAll('.tdb-sg-inline-filter-group [data-filter-kind="treatment"]').length,3);
 }finally{dom.window.close();}
});
test('viewer retains exact image source, desktop bounds, shared counter, Escape focus and scroll-lock restoration',async()=>{
 const{dom,w}=await setup();try{
  const summary=visible(w)[0].querySelector('[data-tdb-sg-open]');summary.focus();summary.click();await pause(40);
  const overlay=w.document.querySelector('[data-tdb-sg-native-overlay]');assert.equal(overlay.hidden,false);assert.ok(!overlay.classList.contains('is-closed'));assert.ok(w.document.documentElement.classList.contains('tdb-sg-locked'));
  assert.equal(overlay.querySelector('.tdb-sg-square').getAttribute('src'),'https://example.test/case-0.webp');assert.ok(overlay.querySelector('.tdb-sg-previous').disabled);
  overlay.querySelector('.tdb-sg-next').click();await pause(10);assert.equal(overlay.querySelector('.is-current h2').textContent,'Case 1');
  assert.equal(overlay.querySelector('[data-tdb-sg-count-label]').textContent,'Smile 2 of 26');
  overlay.querySelector('.is-current').scrollTop=180;
  overlay.querySelector('.tdb-sg-next').click();await pause(10);overlay.querySelector('.tdb-sg-previous').click();await pause(10);
  assert.equal(overlay.querySelector('.is-current').scrollTop,180,'reused desktop neighbours restore the saved case position');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await pause(620);
  assert.ok(overlay.hidden);assert.ok(!w.document.documentElement.classList.contains('tdb-sg-locked'));assert.equal(w.document.activeElement,summary);assert.ok(!w.document.querySelector('main').inert);
 }finally{dom.window.close();}
});
test('mobile viewer wraps within the filtered results',async()=>{
 const{dom,w,toolbar}=await setup(false);try{
  toolbar.querySelector('.tdb-sg-inline-filter-group [data-filter-value="Dr B"]').click();
  visible(w)[0].querySelector('[data-tdb-sg-open]').click();await pause(30);
  const overlay=w.document.querySelector('[data-tdb-sg-native-overlay]');overlay.querySelector('.tdb-sg-previous').click();await pause(10);
  assert.equal(overlay.querySelector('.is-current h2').textContent,'Case 24');assert.equal(overlay.querySelector('[data-tdb-sg-count-label]').textContent,'Smile 9 of 9');
 }finally{dom.window.close();}
});
