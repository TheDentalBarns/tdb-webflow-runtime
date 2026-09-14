const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(base,f),'utf8');
function setup(t,mobile=false,source='dist/tdb-navbar.min.js') {
 const frames=new Map();let id=0,scrollListeners=0;
 const dom=new JSDOM('<html><body><nav class="navbar10_component" transparent-nav="true"><button class="navbar10_menu-button"></button><div class="w-nav-menu navbar10_menu"></div></nav><div class="swiper"><button class="swiper-btn-next">Next</button></div></body></html>',{runScripts:'dangerously',url:'https://dentalbarns.webflow.io/'});
 t.after(()=>dom.window.close());const w=dom.window;
 w.innerWidth=mobile?390:1363;w.innerHeight=mobile?844:936;
 w.matchMedia=q=>({matches:q.includes('max-width')?mobile:!mobile,addEventListener(){}});
 w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};w.cancelAnimationFrame=i=>frames.delete(i);
 const add=w.addEventListener.bind(w);w.addEventListener=(type,...args)=>{if(type==='scroll')scrollListeners++;return add(type,...args);};
 w.eval(read(source));
 function flush(){for(let i=0;i<4;i++){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());}}
 function event(el,type,props={}){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{button:0,isPrimary:true,pointerId:1,clientX:0,clientY:0,...props});el.dispatchEvent(e);}
 function scroll(y){w.scrollY=y;event(w,'scroll');flush();}
 const nav=w.document.querySelector('nav'),button=w.document.querySelector('.swiper-btn-next');
 const focused=()=>w.document.documentElement.classList.contains('tdb-slider-focus');
 return {w,nav,button,event,scroll,flush,focused,listeners:()=>scrollListeners};
}
for(const mobile of [false,true])test('shared scroll release and interruption on '+(mobile?'mobile':'desktop'),t=>{
 const h=setup(t,mobile);h.scroll(2000);const listeners=h.listeners();h.w.eval(read('src/sliders/slider-focus.js'));assert.equal(h.listeners(),listeners,'Slider module adds no scroll listener');
 h.event(h.button,'click');assert.ok(h.focused());h.scroll(1950);h.scroll(1880);assert.ok(h.focused(),'Hold at 120px');h.scroll(1879);assert.ok(!h.focused());assert.equal(h.nav.style.transform,'translateY(0)');
 h.event(h.button,'click');h.scroll(2019);assert.ok(h.focused(),'Hold at 140px');h.scroll(2020);assert.ok(!h.focused());assert.equal(h.nav.style.transform,'translateY(-100%)');
 h.event(h.button,'click');h.scroll(1970);h.scroll(2020);h.scroll(1920);assert.ok(h.focused(),'A reversal resets the opposite counter');h.event(h.button,'click');h.scroll(1820);assert.ok(h.focused(),'Repeated slider input resets the shared counter');h.scroll(1799);assert.ok(!h.focused());
 h.event(h.button,'pointerdown');h.event(h.button,'pointermove',{clientX:60});h.scroll(1600);assert.ok(h.focused(),'A horizontal gesture retains focus');h.event(h.button,'pointerup',{clientX:60});h.scroll(1490);assert.ok(h.focused());h.scroll(1470);assert.ok(!h.focused());
 h.event(h.button,'click');h.event(h.w.document.body,'keydown',{key:'Escape'});assert.ok(!h.focused());h.event(h.button,'click');h.event(h.nav,'focusin');assert.ok(!h.focused());
 h.event(h.button,'click');h.w.document.documentElement.classList.add('tdb-sg-locked');return Promise.resolve().then(()=>{assert.ok(!h.focused());});
});
test('mobile protected zone still releases focus near the top',t=>{const h=setup(t,true);h.scroll(200);h.w.eval(read('src/sliders/slider-focus.js'));h.event(h.button,'click');h.scroll(100);assert.ok(h.focused());h.scroll(39);assert.ok(!h.focused());});
