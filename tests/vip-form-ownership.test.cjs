const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
for(const order of ['form-first','drawer-first']) for(const path of ['/', '/treatments/invisalign','/vip/become-a-patient']) test(`${order} ${path}: wording and user selection survive reopen`,()=>{
 const dom=new JSDOM(`<div id="tdb-vip-drawer" data-tdb-vip-native="1"><a class="tdb-vip-drawer-handle"><span class="tdb-vip-drawer-label">Join VIP</span></a><div class="tdb-vip-drawer-body"><div class="vip-form_wrapper"><p data-tdb-vip-intro></p><form id="vip-drawer-form"><input id="name"><select name="Treatment-Of-Interest"><option value="">Choose</option><option>Signature Assessment</option><option>Invisalign</option><option>Smile Design</option></select></form></div></div></div>`,{url:'https://dentalbarns.webflow.io'+path,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.lenis={start(){},stop(){},resize(){}};
 const observers=[],Observer=w.MutationObserver;
 w.MutationObserver=class extends Observer{constructor(callback){super(callback);observers.push(this);}};
 try{
 const load=n=>w.eval(fs.readFileSync('dist/tdb-'+n+'.js','utf8'));
 for(const name of order==='form-first'?['vip-form','vip-drawer']:['vip-drawer','vip-form'])load(name);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));w.TDBVIPForm.refresh();
 const expected=path.includes('invisalign')?'Start with a Signature Assessment ✦':path.includes('/vip/')?'Reserve my place':'Join VIP';
 const label=w.document.querySelector('.tdb-vip-drawer-label'),select=w.document.querySelector('select');
 assert.equal(label.textContent,expected);assert.equal(select.value,path.includes('invisalign')?'Invisalign':'');
 select.value='Smile Design';w.TDBVIPDrawer.open();w.TDBVIPDrawer.refresh();w.TDBVIPDrawer.close();w.TDBVIPDrawer.open();w.TDBVIPDrawer.refresh();
 assert.equal(select.value,'Smile Design');assert.equal(label.textContent,expected);
 const field=w.document.getElementById('name');field.value='Test';field.dispatchEvent(new w.Event('input',{bubbles:true}));assert(field.classList.contains('is-filled'));
 field.value='';field.dispatchEvent(new w.Event('input',{bubbles:true}));assert(!field.classList.contains('is-filled'));
 }finally{observers.forEach(observer=>observer.disconnect());w.close()}
});

test('unrelated carousel additions do not refresh VIP chrome; dynamic forms and replaced labels still initialise',async()=>{
 const dom=new JSDOM('<main></main><aside id="tdb-vip-drawer"><a class="tdb-vip-drawer-handle"><span class="tdb-vip-drawer-label">Join VIP</span></a></aside>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'}),w=dom.window;
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  w.eval(fs.readFileSync('dist/tdb-vip-form.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await flush();
  let labelReads=0;const get=w.document.getElementById.bind(w.document);w.document.getElementById=id=>{if(id==='tdb-vip-drawer')labelReads++;return get(id);};
  w.document.querySelector('main').innerHTML=Array.from({length:50},(_,i)=>'<article><span>Card '+i+'</span></article>').join('');await flush();assert.equal(labelReads,0);
  const form=w.document.createElement('form');form.id='email-form';form.innerHTML='<select name="Treatment-Of-Interest"><option value="">Choose</option><option>Fast Track</option><option>Invisalign</option></select>';w.document.querySelector('main').append(form);await flush();
  const select=form.querySelector('select');assert.equal(select.options[1].value,'Signature Assessment');assert([...select.options].some(o=>o.value==='Smile Design'));assert(select.classList.contains('placeholder'));assert.equal(labelReads,0);
  w.document.querySelector('.tdb-vip-drawer-label').textContent='Replaced label';await flush();assert.equal(w.document.querySelector('.tdb-vip-drawer-label').textContent,'Join VIP');assert(labelReads>0);
 }finally{w.close();}
});
