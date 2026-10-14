const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const bundle=fs.readFileSync('dist/tdb-vip-form.js','utf8');
const loader=fs.readFileSync('src/forms/loader.js','utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const markup=(options='')=>`<div class="vip-form_wrapper w-form"><p data-tdb-vip-intro></p><form id="email-form" ms-code-submit-form><input name="phone" value="07123456789" required><select name="Treatment-Of-Interest" required><option value="">Choose</option>${options||'<option>Signature Assessment</option><option>Invisalign</option><option>Smile Design</option>'}</select><button type="submit" name="action" value="enquire">Send</button></form><div class="w-form-done" style="display:none">Done</div></div>`;
function setup(path='/treatments/invisalign',html=markup()){
 const d=new JSDOM(html,{url:'https://dentalbarns.webflow.io'+path,runScripts:'outside-only',pretendToBeVisual:true});
 const w=d.window;w.TDBConsent={allows:()=>false};
 return {d,w,form:w.document.querySelector('form'),select:w.document.querySelector('select'),load(){w.eval(bundle);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));}};
}
test('late loading preserves a populated treatment, including on focus/refresh/pageshow',()=>{
 const x=setup();try{x.select.value='Smile Design';x.load();assert.equal(x.select.value,'Smile Design');x.w.TDBVIPForm.refresh();x.select.focus();x.w.dispatchEvent(new x.w.PageTransitionEvent('pageshow',{persisted:true}));assert.equal(x.select.value,'Smile Design');assert.match(x.w.document.querySelector('[data-tdb-vip-intro]').textContent,/Prefer to start/);}finally{x.w.close();}
});
test('untouched empty form receives page suggestion once; later restoration is authoritative',()=>{
 const x=setup();try{x.load();assert.equal(x.select.value,'Invisalign');x.select.value='';x.w.dispatchEvent(new x.w.PageTransitionEvent('pageshow',{persisted:true}));x.select.focus();assert.equal(x.select.value,'');assert(x.select.classList.contains('placeholder'));}finally{x.w.close();}
});
test('successful reset uses native defaults and does not resurrect a manual choice',async()=>{
 const x=setup();try{x.load();x.select.value='Smile Design';x.select.dispatchEvent(new x.w.Event('change',{bubbles:true}));x.form.reset();await flush();x.select.focus();assert.equal(x.select.value,'');assert(x.form.querySelector('button').disabled);assert(x.select.classList.contains('placeholder'));}finally{x.w.close();}
});
test('cancelled reset preserves selection and field state',async()=>{
 const x=setup();try{x.load();x.select.value='Smile Design';x.select.dispatchEvent(new x.w.Event('change',{bubbles:true}));x.form.addEventListener('reset',e=>e.preventDefault());x.form.reset();await flush();assert.equal(x.select.value,'Smile Design');assert(x.select.classList.contains('is-filled'));}finally{x.w.close();}
});
for(const legacy of ['Fast Track','Signature Assessment ✦'])test('normalises '+legacy+' without losing selection',()=>{
 const x=setup('/',markup(`<option selected>${legacy}</option><option>Invisalign</option>`));try{x.load();assert.equal(x.select.value,'Signature Assessment');assert.equal(x.select.selectedOptions[0].textContent,'Signature Assessment ✦');assert([...x.select.options].some(o=>o.value==='Smile Design'));}finally{x.w.close();}
});
test('missing assessment option does not block Smile Design or unsure ordering',()=>{
 const x=setup('/',markup('<option>I’m not sure</option><option selected>Invisalign</option>'));try{x.load();assert.equal(x.select.value,'Invisalign');assert([...x.select.options].some(o=>o.value==='Smile Design'));assert.equal(x.select.lastElementChild.textContent,'I’m not sure');}finally{x.w.close();}
});
test('calculator action deliberately updates both forms without later refresh overwriting',()=>{
 const x=setup();try{x.load();x.w.TDBVIPInterest.fromCalculator('Smile Design');x.w.TDBVIPForm.refresh();assert.equal(x.select.value,'Smile Design');}finally{x.w.close();}
});
for(const consent of [false,true])test('lead reporting obeys current permission: '+consent,async()=>{
 const x=setup('/');try{let sent=0;x.w.fbq=()=>sent++;x.w.TDBConsent.allows=category=>consent&&category==='performance';x.w.HTMLElement.prototype.getClientRects=()=>[{}];x.load();const done=x.w.document.querySelector('.w-form-done');done.style.display='block';await flush();assert.equal(sent,consent?1:0);x.w.TDBConsent.allows=()=>true;done.classList.add('changed');await flush();assert.equal(sent,consent?1:0,'no retroactive or duplicate lead');}finally{x.w.close();}
});
test('share fallback supports focused child and avoids key-repeat activation',()=>{
 const x=setup('/',markup()+'<a data-tdb-vip-share role="button" tabindex="0"><span tabindex="0">Share</span></a>');try{let shares=0;x.w.navigator.share=async()=>shares++;x.load();const child=x.w.document.querySelector('[data-tdb-vip-share] span');for(const key of ['Enter',' '])child.dispatchEvent(new x.w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));child.dispatchEvent(new x.w.KeyboardEvent('keydown',{key:' ',repeat:true,bubbles:true,cancelable:true}));assert.equal(shares,2);}finally{x.w.close();}
});
function withLoader(){
 const x=setup();let calls=0,resolve,reject;const observers=[];
 x.w.IntersectionObserver=class{constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){}};
 x.w.TDBModules={load(){calls++;return new Promise((a,b)=>{resolve=()=>{x.load();a();};reject=b;});}};
 x.w.eval(`const TDBRuntimeModuleRoot=new URL('https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@release/dist/');\n${loader}\nprepareFormsLoader();`);
 x.w.document.dispatchEvent(new x.w.Event('DOMContentLoaded'));
 return Object.assign(x,{calls:()=>calls,resolve:()=>resolve(),reject:()=>reject(Error('offline')),near:()=>observers[0].cb([{isIntersecting:true}])});
}
test('no eager request; proximity and repeated intent share one flight',async()=>{
 const x=withLoader();try{assert.equal(x.calls(),0);x.near();x.select.focus();x.near();assert.equal(x.calls(),1);x.resolve();await flush();assert(x.w.TDBFormsLoader.status().loaded);}finally{x.w.close();}
});
test('empty selection made while loading stays empty',async()=>{
 const x=withLoader();try{x.select.dispatchEvent(new x.w.Event('change',{bubbles:true}));x.near();x.resolve();await flush();assert.equal(x.select.value,'');}finally{x.w.close();}
});
test('first submit waits, normalises phone and delivers once with original submitter',async()=>{
 const x=withLoader();try{x.select.value='Smile Design';let sent=[];x.form.addEventListener('submit',e=>{sent.push({phone:x.form.elements.phone.value,submitter:e.submitter});e.preventDefault();});const button=x.form.querySelector('button');x.form.requestSubmit(button);x.form.requestSubmit(button);assert.equal(sent.length,0);assert.equal(x.calls(),1);assert.equal(x.form.getAttribute('aria-busy'),'true');x.resolve();await flush();assert.equal(sent.length,1);assert.equal(sent[0].phone,'+447123456789');assert.equal(sent[0].submitter,button);assert.equal(x.form.getAttribute('aria-busy'),null);}finally{x.w.close();}
});
test('failed preparation preserves data, reports failure and allows retry',async()=>{
 const x=withLoader();try{x.select.value='Smile Design';let sent=0;x.form.addEventListener('submit',e=>{sent++;e.preventDefault();});x.form.requestSubmit(x.form.querySelector('button'));x.reject();await flush();assert.equal(sent,0);assert.equal(x.select.value,'Smile Design');assert(x.form.querySelector('[role="alert"]'));assert.equal(x.form.getAttribute('aria-busy'),null);x.form.requestSubmit(x.form.querySelector('button'));assert.equal(x.calls(),2);x.resolve();await flush();assert.equal(sent,1);}finally{x.w.close();}
});
test('native validation still blocks an invalid form after deferred preparation',async()=>{
 const x=withLoader();try{x.select.value='Smile Design';let sent=0;x.form.addEventListener('submit',e=>{sent++;e.preventDefault();});x.form.requestSubmit(x.form.querySelector('button'));x.form.elements.phone.value='';x.resolve();await flush();assert.equal(sent,0);}finally{x.w.close();}
});
test('calculator intent before loading is applied after readiness',async()=>{
 const x=withLoader();try{x.w.TDBVIPInterest.fromCalculator('Smile Design');x.resolve();await flush();assert.equal(x.select.value,'Smile Design');}finally{x.w.close();}
});
test('combined and legacy bundles cannot duplicate the forms owner',()=>{
 const x=setup();try{x.load();const owner=x.w.TDBForms;x.w.eval(fs.readFileSync('dist/tdb-forms.min.js','utf8'));assert.equal(x.w.TDBForms,owner);}finally{x.w.close();}
});
