const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = (file) => fs.readFileSync(__dirname + '/../' + file, 'utf8');
function wheel() {
  const dom = new JSDOM(`<section data-tdb-guide><nav>${Array.from({length:5},(_,i)=>`<a href="#" data-tdb-guide-choice="${i}" class="${i===0?'w--current':''}" style="color:${i===0?'rgb(0,0,0)':'rgb(110,110,110)'}">Chapter ${i+1}</a>`).join('')}</nav><div class="art"><div class="treatment-guide_orbit"></div><span data-tdb-guide-number>01</span><a data-tdb-guide-ball tabindex="-1" aria-hidden="true"><span style="background-color:rgb(0,0,0)"></span></a></div></section>`,{runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, root=w.document.querySelector('section'), ball=root.querySelector('[data-tdb-guide-ball]');
  const choices=[...root.querySelectorAll('[data-tdb-guide-choice]')];
  root.querySelector('.art').getBoundingClientRect=()=>({left:0,top:0,width:400,height:400});
  root.querySelector('.treatment-guide_orbit').getBoundingClientRect=()=>({left:104,top:104,width:192,height:192});
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.IntersectionObserver=class{observe(){}disconnect(){}};
  w.TDBMotionPolicy={reduced:{matches:false}};
  // An OS preference must not disable this site's approved design-review policy.
  w.matchMedia=()=>({matches:true});
  let time=0,id=0;const frames=new Map();
  w.requestAnimationFrame=fn=>(frames.set(++id,fn),id);w.cancelAnimationFrame=id=>frames.delete(id);
  Object.defineProperty(w.performance,'now',{value:()=>time});
  for(const choice of choices)choice.addEventListener('click',e=>{e.preventDefault();choices.forEach(c=>c.classList.toggle('w--current',c===choice));choice.focus()});
  w.eval(read('src/treatment-guide/wheel.js'));const api=w.TDBTreatmentGuideWheel.mount(root);
  function tick(count=1){for(let i=0;i<count;i++){time+=16;const list=[...frames.values()];frames.clear();list.forEach(fn=>fn(time))}}
  function pointer(type,x,y){const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,clientX:x,clientY:y,button:0});ball.dispatchEvent(e)}
  const position=()=>ball.style.transform.match(/-?[\d.]+(?=px)/g).map(Number);
  return{w,root,ball,choices,api,tick,pointer,position,dispose(){api.destroy();w.close()}};
}
test('wheel stretches beyond the track and returns through multiple spring positions',()=>{
 const t=wheel();try{
  t.pointer('pointerdown',200,104);t.pointer('pointermove',380,180);t.tick(30);
  assert.ok(t.position()[0]>150);
  const before=t.position();t.pointer('pointerup',380,180);assert.deepEqual(t.position(),before,'release must not teleport');
  const frames=[];for(let i=0;i<10;i++){t.tick(5);frames.push(t.position().join(','))}assert.ok(new Set(frames).size>5);
  t.tick(180);const [x,dy]=t.position();assert.ok(Math.abs(Math.hypot(x,dy-96)-96)<.05);
 }finally{t.dispose()}
});
test('ball keyboard keeps focus and native keyboard tab changes update the wheel',async()=>{
 const t=wheel();try{
  t.ball.focus();t.ball.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(t.ball.getAttribute('aria-valuenow'),'2');assert.equal(t.w.document.activeElement,t.ball);
  t.choices.forEach((c,i)=>c.classList.toggle('w--current',i===4));await Promise.resolve();
  assert.equal(t.ball.getAttribute('aria-valuenow'),'5');
 }finally{t.dispose()}
});
test('chapter colour has intermediate values before the new resting highlight',()=>{
 const t=wheel();try{
  const before=t.choices[1].style.color;t.choices[1].click();t.tick(2);const during=t.choices[1].style.color;
  t.tick(150);const after=t.choices[1].style.color;assert.notEqual(during,before);assert.notEqual(during,after);
 }finally{t.dispose()}
});
test('teardown returns the optional ball to its authored non-focusable state',()=>{
 const t=wheel();t.api.destroy();assert.equal(t.ball.getAttribute('tabindex'),'-1');assert.equal(t.ball.getAttribute('aria-hidden'),'true');t.w.close();
});
test('drawer can return focus to a newly selected native chapter after the launch pane hides',async()=>{
 const dom=new JSDOM('<main><button id="old">Open old</button><button id="current">Open current</button></main><div data-tdb-drawer><div data-tdb-drawer-backdrop></div><div data-tdb-drawer-panel><button data-tdb-drawer-close>Close</button></div></div>',{runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,doc=w.document;w.TDBMotion={reduced:{matches:true,addEventListener(){},removeEventListener(){}},duration:()=>0};w.TDBScrollLock={acquire:()=>()=>{}};w.matchMedia=()=>({matches:false});
 w.eval(read('src/shared/drawer.js'));
 const api=w.TDBDrawer.mount(doc.querySelector('[data-tdb-drawer]'),{returnFocus:()=>doc.querySelector('#current')});
 try{await api.open(doc.querySelector('#old'));doc.querySelector('#old').hidden=true;await api.close(true);assert.equal(doc.activeElement.id,'current');}finally{api.destroy();w.close()}
});
