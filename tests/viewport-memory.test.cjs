const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('dist/tdb-viewport-memory.min.js','utf8');
const key='tdb:view:v2:/';
const html=`<p id="near" data-tdb-dd-page>Near text</p><p id="far" data-tdb-dd-page>Far text</p>
<section id="photo" data-tdb-page-break data-tdb-parallax-from="-20vh" data-tdb-parallax-to="20vh" data-tdb-parallax-reveal-in="1"><img src="photo.webp"><div data-tdb-parallax-fade="0" data-tdb-parallax-fade-property="black"></div></section>
<section id="distant" data-tdb-page-break><img src="far.webp"></section>
<section id="opacity" data-tdb-page-break data-tdb-parallax-mode="opacity"><img src="logo.svg"><div data-tdb-parallax-fade="0.2" data-tdb-parallax-fade-from="0.8"></div></section>`;
function fixture(snapshot,options={}) {
 const dom=new JSDOM(html,{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.innerWidth=1000;w.innerHeight=800;w.scrollY=2000;
 w.performance.getEntriesByType=()=>[{type:options.type||'reload'}];
 if(snapshot)w.sessionStorage.setItem(key,JSON.stringify(snapshot));
 if(options.width)w.innerWidth=options.width;
 if(options.height)w.innerHeight=options.height;
 // The memory layer must never trigger rendering measurements.
 w.Element.prototype.getBoundingClientRect=()=>{throw Error('memory forced layout')};
 w.getComputedStyle=()=>{throw Error('memory read computed style')};
 return w;
}
function save(w) {
 w.eval(code);
 const d=w.document;
 w.TDBDDMemory.save([
  {node:d.querySelector('#near'),owner:{},value:.4,geometry:[2200,80]},
  {node:d.querySelector('#far'),owner:{},value:.7,geometry:[9000,80]}
 ]);
 w.TDBPageBreakMemory.save([
  {wrapper:d.querySelector('#photo'),node:d.querySelector('#photo img'),y:44,alpha:.6,reveal:true,revealAlpha:.35,geometry:[2100,900]},
  {wrapper:d.querySelector('#distant'),node:d.querySelector('#distant img'),y:2,alpha:1,geometry:[8000,500]},
  {wrapper:d.querySelector('#opacity'),node:d.querySelector('#opacity'),y:0,alpha:.5,geometry:[1700,500]}
 ]);
 return JSON.parse(w.sessionStorage.getItem(key));
}
function snapshot(){const w=fixture();try{return save(w)}finally{w.close()}}
test('one record saves only viewport plus 25% buffer, without layout reads',()=>{
 const value=snapshot();assert.equal(Object.keys(value.d).length,1);assert.equal(Object.keys(value.p).length,2);
 assert.equal(value.s,2000);assert.equal(value.w,1000);assert.equal(value.h,800);
});
test('both adapters restore text, image movement, reveal, black and opacity fades',()=>{
 const w=fixture(snapshot());try{
  w.eval(code);const d=w.document,photo=d.querySelector('#photo img'),opacity=d.querySelector('#opacity');
  assert.equal(d.querySelector('#near').style.opacity,'0.4');assert.equal(d.querySelector('#far').style.opacity,'');
  assert.equal(photo.style.transform,'translate3d(0, 44.0000px, 0)');assert.equal(photo.style.opacity,'0.35');
  assert.equal(d.querySelector('#photo div').style.backgroundColor,'rgba(0, 0, 0, 0.6)');
  assert.equal(opacity.style.transform,'');assert.equal(opacity.querySelector('div').style.opacity,'0.5');
  assert.equal(w.TDBPageBreakMemory.take(photo).original,'');assert.equal(w.TDBPageBreakMemory.take(photo),undefined);
  assert.equal(w.TDBDDMemory.take(d.querySelector('#near')),true);
  const api=w.TDBDDMemory;w.eval(code);assert.equal(w.TDBDDMemory,api);
 }finally{w.close()}
});
test('fresh navigation, stale state, changed dimensions and changed content/config do not restore',()=>{
 const base=snapshot();
 for(const [value,options] of [[base,{type:'navigate'}],[{...base,t:Date.now()-86400001},{}],[base,{width:900}],[base,{height:500}]]){
  const w=fixture(value,options);try{w.eval(code);assert.equal(w.document.querySelector('#near').style.opacity,'');assert.equal(w.document.querySelector('#photo img').style.transform,'')}finally{w.close()}
 }
 const w=fixture(base);try{
  w.document.querySelector('#near').textContent='Changed content';w.document.querySelector('#photo').setAttribute('data-tdb-parallax-to','40vh');
  w.eval(code);assert.equal(w.document.querySelector('#near').style.opacity,'');assert.equal(w.document.querySelector('#photo img').style.transform,'');
 }finally{w.close()}
});
test('streamed parser content restores when complete; unrelated additions do not rescan the document',async()=>{
 const w=fixture(snapshot());try{
  await new Promise(resolve=>w.addEventListener('load',resolve,{once:true}));
  const d=w.document;Object.defineProperty(d,'readyState',{value:'loading',configurable:true});
  d.body.innerHTML='';let queries=0;const original=d.querySelectorAll.bind(d);d.querySelectorAll=(s)=>{queries++;return original(s)};
  w.eval(code);assert.equal(queries,1);
  const p=d.createElement('p');p.id='near';p.setAttribute('data-tdb-dd-page','');d.body.appendChild(p);await Promise.resolve();assert.equal(p.style.opacity,'');
  p.appendChild(d.createTextNode('Near text'));await Promise.resolve();assert.equal(p.style.opacity,'0.4');
  const wrapper=d.createElement('section');wrapper.id='photo';wrapper.setAttribute('data-tdb-page-break','');wrapper.setAttribute('data-tdb-parallax-from','-20vh');wrapper.setAttribute('data-tdb-parallax-to','20vh');wrapper.setAttribute('data-tdb-parallax-reveal-in','1');
  wrapper.innerHTML='<img src="photo.webp">';d.body.appendChild(wrapper);await Promise.resolve();assert.equal(wrapper.querySelector('img').style.transform,'');
  wrapper.insertAdjacentHTML('beforeend','<div data-tdb-parallax-fade="0" data-tdb-parallax-fade-property="black"></div>');await Promise.resolve();assert.equal(wrapper.querySelector('img').style.transform,'translate3d(0, 44.0000px, 0)');
  for(let i=0;i<20;i++){d.body.appendChild(d.createElement('aside'));d.body.appendChild(d.createTextNode(' '));}await Promise.resolve();
  assert.equal(queries,1,'no full document scan on parser mutations');
  d.dispatchEvent(new w.Event('DOMContentLoaded'));assert.equal(queries,2);
  const restored=w.TDBPageBreakMemory.take(wrapper.querySelector('img'));assert.ok(restored);
  p.style.opacity='.8';wrapper.querySelector('img').style.transform='translateY(5px)';p.appendChild(d.createTextNode('!'));await Promise.resolve();assert.equal(p.style.opacity,'0.8');
 }finally{w.close()}
});
test('malformed saved numbers and unavailable storage fail safely',()=>{
 const bad=snapshot();Object.keys(bad.d).forEach(k=>bad.d[k]=-1);Object.keys(bad.p).forEach(k=>bad.p[k]=[1e9,.5,null]);
 const w=fixture(bad);try{w.eval(code);assert.equal(w.document.querySelector('#near').style.opacity,'');assert.equal(w.document.querySelector('#photo img').style.transform,'')}finally{w.close()}
 const blocked=fixture();try{Object.defineProperty(blocked,'sessionStorage',{get(){throw Error('blocked')}});assert.doesNotThrow(()=>blocked.eval(code));assert.doesNotThrow(()=>blocked.TDBDDMemory.save([]))}finally{blocked.close()}
});
test('existing motion runtime consumes shared memory and saves its cached geometry',async()=>{
 const w=fixture(snapshot());try{
  const d=w.document;
  w.Element.prototype.getBoundingClientRect=function(){const top=this.id==='far'||this.id==='distant'?6000:100;return {top,bottom:top+500,left:0,right:1000,width:1000,height:500}};
  w.Element.prototype.getClientRects=function(){return [this.getBoundingClientRect()]};
  w.getComputedStyle=node=>({opacity:node.style.opacity||'1',visibility:'visible',transform:'none'});
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.DOMMatrixReadOnly=class{constructor(){this.m42=0}};
  w.eval(code);w.eval(fs.readFileSync('src/shared/motion.js','utf8'));
  const text=w.TDBMotion.ddText([d.querySelector('#near'),d.querySelector('#far')]);
  const breaks=w.TDBMotion.pageBreaks(d.querySelectorAll('[data-tdb-page-break]'));
  await new Promise(resolve=>setTimeout(resolve,40));
  w.dispatchEvent(new w.Event('pagehide'));
  const value=JSON.parse(w.sessionStorage.getItem(key));assert.equal(Object.keys(value.d).length,1);assert.equal(Object.keys(value.p).length,2);
  text.destroy();breaks.destroy();
 }finally{w.close()}
});
