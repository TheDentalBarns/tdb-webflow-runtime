const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/navbar/nav-motion.js'),'utf8');
function fixture(t,height=844) {
 const dom=new JSDOM('<div class="navbar10_component"><button class="w-nav-button"></button><div class="navbar10_menu"></div></div><main></main>',{runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>dom.window.close());const w=dom.window,nav=w.document.querySelector('.navbar10_component'),button=nav.querySelector('button');
 w.innerHeight=height;
 const native={config:{duration:500,easing:'ease-out-quart'}};
 w.jQuery={data(el,key){assert.equal(el,nav);assert.equal(key,'.w-nav');return native;}};
 w.eval(source);
 return {w,nav,button,native,motion:w.TDBNavMotion,resize(height){w.innerHeight=height;w.dispatchEvent(new w.Event('resize'));}};
}
test('mobile native slide and CSS cadence scale by viewport height, independent of document length',t=>{
 const h=fixture(t,600);assert.equal(h.native.config.duration,506);
 assert.equal(h.nav.getAttribute('data-duration'),'506');
 Object.defineProperty(h.w.document.documentElement,'scrollHeight',{value:25000});
 h.resize(1200);assert.equal(h.native.config.duration,716);
 assert.equal(h.w.document.documentElement.style.getPropertyValue('--tdb-nav-detail-duration'),'601ms');
 assert.equal(h.native.config.easing,'ease-out-quart');
 assert(h.motion.current.lock>h.motion.current.textIn+h.motion.current.delay);
 assert(h.motion.current.cleanup>h.motion.current.panel);
 h.resize(200);assert.equal(h.native.config.duration,400);
 h.resize(4000);assert.equal(h.native.config.duration,950);
});
test('resize cannot retime an active slide, and the next keyboard or outside-click close uses the new height',t=>{
 const h=fixture(t,600);h.nav.classList.add('tdb-menu-transitioning');h.button.classList.add('w--open');
 h.resize(1200);assert.equal(h.native.config.duration,506);
 h.button.dispatchEvent(new h.w.MouseEvent('click',{bubbles:true}));assert.equal(h.native.config.duration,506);
 h.nav.classList.remove('tdb-menu-transitioning');
 h.button.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(h.native.config.duration,716);
 h.resize(900);assert.equal(h.native.config.duration,716);
 h.w.document.querySelector('main').dispatchEvent(new h.w.MouseEvent('click',{bubbles:true}));assert.equal(h.native.config.duration,620);
});
test('Webflow initialization receives the updated native duration',t=>{
 const h=fixture(t,936);h.native.config={duration:500};h.w.Webflow[0]();assert.equal(h.native.config.duration,632);
});
