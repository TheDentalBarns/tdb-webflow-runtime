const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = p => fs.readFileSync(p, 'utf8');
const tick = () => new Promise(r => setImmediate(r));
const root = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@'+'a'.repeat(40)+'/dist/';

function setup(lazy = true, width = 1440) {
  const dom = new JSDOM(`<html data-wf-page="home"><body>
    <a id="open" href="#VIP">Join VIP</a>
    <section id="VIP"><div class="w-form"><form id="email-form"><input name="Name" value="Kept"><input type="submit" value="Please wait..." disabled></form></div></section>
    <div id="tdb-vip-drawer" data-tdb-vip-native="1" ${lazy?'data-tdb-vip-lazy':''}>
      <a class="tdb-vip-drawer-handle"><span class="tdb-vip-drawer-label">Join VIP</span></a>
      <div class="tdb-vip-drawer-body"></div>
    </div></body></html>`, {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w = dom.window, d = w.document, drawer = d.getElementById('tdb-vip-drawer');
  w.jQuery = require('jquery')(w);
  Object.defineProperty(w,'innerWidth',{value:width});
  w.matchMedia = q=>({matches:q.includes('max-width')?width<=767:q.includes('min-width')&&width>=768,addEventListener(){}});
  w.scrollTo = ()=>{};
  w.HTMLElement.prototype.scrollIntoView = ()=>{};
  w.TDBConsent = {allows:category=>!category};
  w.TDBRuntimePageState = {vipScrollSeed:{lastY:0,up:0,down:0,peek:false}};
  w.tdbUIIsReady=w.tdbStyleIsReady=()=>true;
  w.tdbEnsureUI=w.tdbEnsureVIPUI=w.tdbEnsureVIPChrome=()=>Promise.resolve();
  let readyCalls=0;
  const native = {ready(){
    readyCalls++;
    d.querySelectorAll('.w-form form').forEach(form=>{
      const state=w.jQuery.data(form,'.w-form')||{};
      state.handler=()=>{};state.success=false;
      w.jQuery.data(form,'.w-form',state);
      form.querySelector('[type="submit"]').disabled=false;
    });
  }};
  w.Webflow={require:name=>name==='forms'?native:null};
  const requests=[];
  const gates=new Map();
  w.TDBModules={resolve:u=>String(u),load:async url=>{
    const file=new URL(url).pathname.split('/').pop();requests.push(file);
    if(gates.has(file))await gates.get(file);
    if(file.endsWith('.js'))w.eval(read('dist/'+file));
  }};
  w.TDBFormsLoader={wasEdited:()=>false,load:async()=>{if(!w.TDBForms)w.eval(read('dist/tdb-vip-form.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));}};
  w.eval(`const TDBRuntimeModuleRoot=new URL('${root}');\n`+read('src/vip-drawer/loader.js'));
  w.prepareVIPDrawerLoader();
  return {w,d,drawer,requests,gates,native,readyCalls:()=>readyCalls,close:()=>w.close()};
}

test('ordinary scroll does not prepare VIP; explicit shell preparation leaves content for opening',async()=>{
  const x=setup();try{
    assert.deepEqual(x.requests,[]);
    x.w.scrollY=500;x.w.dispatchEvent(new x.w.Event('scroll'));await tick();
    assert.deepEqual(x.requests,[]);
    await x.w.TDBVIPDrawerLoader.load();
    assert.deepEqual(x.requests,['tdb-vip-drawer.js']);
    assert.equal(x.drawer.querySelector('form'),null);
    const a=x.w.TDBVIPDrawer.open(),b=x.w.TDBVIPDrawer.open();
    assert.equal(a,b);await a;
    assert.equal(x.w.TDBVIPDrawer.status().state,2);
    assert.equal(x.drawer.querySelectorAll('form').length,1);
    assert.equal(x.readyCalls(),1);
    assert.equal(x.requests.filter(p=>p==='tdb-vip-content.js').length,1);
    assert.equal(x.requests.filter(p=>p==='tdb-vip-content.css').length,1);
    const form=x.drawer.querySelector('form');
    form.elements.Name.value='Retained';
    x.w.TDBVIPDrawer.close();await x.w.TDBVIPDrawer.open();
    assert.equal(x.drawer.querySelector('form'),form);
    assert.equal(form.elements.Name.value,'Retained');
    assert.equal(x.readyCalls(),1);
  }finally{x.close();}
});

test('unique first-form anchor keeps drawer proximity and fallback on the inline form',async()=>{
 const x=setup();try{
  const inline=x.d.getElementById('VIP');inline.id='VIP-inline';
  const footer=x.d.createElement('section');footer.id='VIP';x.d.body.append(footer);
  const observed=[];x.w.IntersectionObserver=class{constructor(cb){this.cb=cb;}observe(n){observed.push(n);}disconnect(){}};
  let scrolled=null;x.w.HTMLElement.prototype.scrollIntoView=function(){scrolled=this;};
  await x.w.TDBVIPDrawerLoader.load();assert(observed.includes(inline),'proximity follows the first inline form');assert(!observed.includes(footer));
  x.w.TDBVIPDrawerLoader.fallback();assert.equal(scrolled,inline,'failed drawer opening falls back to the first form');
 }finally{x.close();}
});

test('first trigger click awaits content and CSS, then preserves the full slide entrance',async()=>{
  const x=setup();try{
    let release;x.gates.set('tdb-vip-content.css',new Promise(r=>release=r));
    x.d.getElementById('open').click();await tick();
    assert.equal(x.w.TDBVIPDrawer.status().state,0);
    assert.equal(x.drawer.querySelector('.tdb-vip-drawer-handle').getAttribute('aria-busy'),'true');
    assert.equal(x.drawer.querySelector('form'),null);
    release();await tick();await tick();
    assert.equal(x.w.TDBVIPDrawer.status().state,2);
    assert.equal(x.drawer.querySelector('.tdb-vip-drawer-handle').hasAttribute('aria-busy'),false);
    assert.match(x.drawer.style.getPropertyValue('--tdb-vip-drawer-duration'),/ms$/);
  }finally{x.close();}
});

test('Escape cancels a delayed opening without discarding prepared form; next open works',async()=>{
  const x=setup();try{
    await x.w.TDBVIPDrawerLoader.load();
    let release;x.gates.set('tdb-vip-content.css',new Promise(r=>release=r));
    const opening=x.w.TDBVIPDrawer.open();
    x.d.dispatchEvent(new x.w.KeyboardEvent('keydown',{key:'Escape'}));
    release();await opening;
    assert.equal(x.w.TDBVIPDrawer.status().state,0);
    await x.w.TDBVIPDrawer.open();
    assert.equal(x.w.TDBVIPDrawer.status().state,2);
    assert.equal(x.drawer.querySelectorAll('form').length,1);
  }finally{x.close();}
});

test('a handle tap survives residual scrolling while its content prepares',async()=>{
  for(const width of [390,1440]) {
    const x=setup(true,width);try{
      x.d.getElementById('VIP').getBoundingClientRect=()=>({top:10000,bottom:11000});
      await x.w.TDBVIPDrawerLoader.load();
      let release;x.gates.set('tdb-vip-content.css',new Promise(r=>release=r));
      x.w.scrollY=1500;
      x.w.TDBVIPDrawer.resumeScroll({peek:true,up:200});
      assert.equal(x.w.TDBVIPDrawer.status().state,1);
      const handle=x.drawer.querySelector('.tdb-vip-drawer-handle');
      handle.click();const opening=x.w.TDBVIPDrawer.open();
      x.w.scrollY=1700;x.w.dispatchEvent(new x.w.Event('scroll'));
      await new Promise(r=>setTimeout(r,30));
      assert.equal(x.w.TDBVIPDrawer.status().state,1,'scroll settling must not dismiss a requested opening');
      assert.equal(handle.getAttribute('aria-busy'),'true');
      release();await opening;
      assert.equal(x.w.TDBVIPDrawer.status().state,2,'the first tap still opens the prepared drawer');
      assert.equal(x.requests.filter(p=>p==='tdb-vip-content.css').length,1);
    }finally{x.close();}
  }
});

test('a fresh request after Escape reuses the pending load and honours the latest intent',async()=>{
  const x=setup(true,390);try{
    await x.w.TDBVIPDrawerLoader.load();
    let release;x.gates.set('tdb-vip-content.css',new Promise(r=>release=r));
    const first=x.w.TDBVIPDrawer.open();
    x.d.dispatchEvent(new x.w.KeyboardEvent('keydown',{key:'Escape'}));
    const second=x.w.TDBVIPDrawer.open();assert.equal(first,second);
    release();await second;
    assert.equal(x.w.TDBVIPDrawer.status().state,2);
    assert.equal(x.drawer.querySelectorAll('form').length,1);
  }finally{x.close();}
});

test('native registration preserves an existing footer request and empty form validation',async()=>{
  const x=setup();try{
    const footer=x.d.getElementById('email-form');
    x.w.jQuery.data(footer,'.w-form',{success:true,handler(){}});
    await x.w.TDBVIPDrawerLoader.prepareContent();
    assert.equal(footer.elements.Name.value,'Kept');
    assert.equal(footer.querySelector('[type="submit"]').disabled,true);
    assert.equal(footer.querySelector('[type="submit"]').value,'Please wait...');
    assert.equal(x.w.jQuery.data(footer,'.w-form').success,true);
    const form=x.drawer.querySelector('form');
    assert.equal(form.dataset.wfPageId,'home');
    assert.equal(form.dataset.wfElementId,'1a81a875-96cc-14f3-2f27-56aec919cb8f');
    assert.equal(typeof x.w.jQuery.data(form,'.w-form').handler,'function');
    assert.equal(form.querySelector('[type="submit"]').disabled,true);
    assert.equal(form.checkValidity(),false);
    assert.equal(form.querySelectorAll('input[required],select[required]').length,7);
    assert.equal(form.querySelectorAll('style,script').length,0);
  }finally{x.close();}
});

test('failed content load leaves drawer closed, falls back, and permits a fresh attempt',async()=>{
  const x=setup();try{
    await x.w.TDBVIPDrawerLoader.load();
    let fail;x.gates.set('tdb-vip-content.css',new Promise((r,j)=>fail=j));
    const a=x.w.TDBVIPDrawer.open();fail(Error('offline'));await a;
    assert.equal(x.w.TDBVIPDrawer.status().state,0);
    assert.equal(x.drawer.querySelector('.tdb-vip-drawer-handle').hasAttribute('aria-busy'),false);
    x.gates.delete('tdb-vip-content.css');
    await x.w.TDBVIPDrawer.open();
    assert.equal(x.w.TDBVIPDrawer.status().state,2);
    assert.equal(x.drawer.querySelectorAll('form').length,1);
  }finally{x.close();}
});

test('existing native drawers do not request the Home content assets',async()=>{
  const x=setup(false);try{
    await x.w.TDBVIPDrawerLoader.load();
    await x.w.TDBVIPDrawer.open();
    assert.equal(x.w.TDBVIPDrawer.status().state,2);
    assert.deepEqual(x.requests,['tdb-vip-drawer.js']);
  }finally{x.close();}
});
