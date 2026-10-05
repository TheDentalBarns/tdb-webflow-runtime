// Execute the production progress module against measured-geometry fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(process.env.TDB_PROGRESS_SOURCE || path.join(__dirname,'../src/sliders/parallax.js'),'utf8');
const start = source.indexOf('  const progress = (() => {');
const end = source.indexOf('\n  })();',start)+9;
assert(start>=0 && end>start);
const code = source.slice(start,end)+'; progress.refresh();';
function fixture({treatment=false,width=1000,dpr=1}={}) {
  const queue=new Map(),observers={},stats={indices:0,track:0,slides:0};let seq=0,offset=0;
  const cls=values=>{const set=new Set(values);return {contains:v=>set.has(v),add:v=>set.add(v),remove:v=>set.delete(v),toggle:(v,on)=>on?set.add(v):set.delete(v)};};
  const node=()=>({style:{},classList:cls([]),setAttribute(){},addEventListener(){},removeEventListener(){},append(){},remove(){}});
  const fill=node(),wrapped=node(),track=Object.assign(node(),{firstElementChild:fill,children:[fill,wrapped],getBoundingClientRect(){stats.track++;return {width:Number.parseFloat(this.style.width)||0};}});
  const wrapper=Object.assign(node(),{children:[]});
  const makeSlide=(index,x,w=width)=>Object.assign(node(),{index,x,w,parentElement:wrapper,classList:cls(['swiper-slide']),getAttribute(){stats.indices++;return this.index===null?null:String(this.index);},getBoundingClientRect(){stats.slides++;return {left:this.x-offset,width:this.w};}});
  wrapper.children=[4,0,1,2,3,4,0].map((index,i)=>makeSlide(index,(i-1)*width));
  const viewport=Object.assign(node(),{querySelector:()=>wrapper,getBoundingClientRect:()=>({left:0,right:width,top:0,bottom:500,width,height:500})});
  const component=Object.assign(node(),{clientTop:0,clientLeft:0,closest:()=>treatment?{}:null,querySelector:s=>s.includes('native-progress')?track:s===':scope > .swiper'?viewport:null,getBoundingClientRect:()=>({left:0,top:0})});
  const document={hidden:false,documentElement:{dataset:{wfPage:'677cf86df9952f978d94d8a9'},clientWidth:width},querySelectorAll:()=>[component],addEventListener:(e,cb)=>observers[e]=cb,removeEventListener(){}};
  const window={devicePixelRatio:dpr,addEventListener:(e,cb)=>observers[e]=cb,removeEventListener(){}};
  const observer=key=>class{constructor(cb){observers[key]=cb;}observe(){}disconnect(){}};
  const context={document,window,innerWidth:width,Element:class{},IntersectionObserver:observer('intersection'),MutationObserver:observer('mutation'),ResizeObserver:observer('size'),requestAnimationFrame:cb=>{queue.set(++seq,cb);return seq;},cancelAnimationFrame:id=>queue.delete(id)};
  vm.runInNewContext(code,context);
  const step=()=>{const frame=[...queue.values()];queue.clear();frame.forEach(cb=>cb());};
  return {stats,fill,wrapped,track,wrapper,makeSlide,observers,document,queue,step,offset:v=>offset=v,visible:v=>observers.intersection([{isIntersecting:v}]),resize:(w,p=dpr)=>{width=w;window.devicePixelRatio=p;context.innerWidth=w;document.documentElement.clientWidth=w;observers.size();},result:()=>[fill.style.width,fill.style.transform,wrapped.style.transform]};
}
function run() {
  const f=fixture();f.visible(true);
  assert.deepEqual(f.result(),['200px','translateX(0px)','translateX(-1000px)']);
  f.offset(1500);f.step();assert.equal(f.fill.style.transform,'translateX(300px)');
  f.offset(4500);f.step();assert.equal(f.fill.style.transform,'translateX(900px)');
  f.offset(5000);f.step();assert.equal(f.fill.style.transform,'translateX(0px)');
  f.offset(-500);f.step();assert.equal(f.fill.style.transform,'translateX(900px)');
  const reads={...f.stats};for(let i=0;i<120;i++)f.step();
  assert.equal(f.stats.indices,reads.indices,'stable frames reuse logical indices');
  assert.equal(f.stats.track,reads.track,'stable frames reuse measured track width');
  assert.equal(f.stats.slides-reads.slides,120*7,'rendered movement is still sampled on every visible frame');
  f.offset(1000);f.step();assert.equal(f.fill.style.transform,'translateX(200px)','movement after idle is not missed');
  f.resize(750,2);f.step();assert.equal(f.fill.style.width,'150px');
  f.wrapper.children=[0,1].map((i)=>f.makeSlide(i,i*750,750));f.offset(750);
  f.observers.mutation([{type:'childList',target:f.wrapper}]);f.step();assert.equal(f.fill.style.width,'375px');
  assert.equal(f.fill.style.transform,'translateX(375px)');
  f.wrapper.children[1].index=0;f.observers.mutation([{type:'attributes',target:f.wrapper.children[1],attributeName:'data-swiper-slide-index'}]);f.step();
  assert.equal(f.fill.style.width,'750px');
  f.visible(false);assert.equal(f.queue.size,0);f.visible(true);assert.equal(f.queue.size,1);
  f.document.hidden=true;f.observers.visibilitychange();assert.equal(f.queue.size,0);
  f.document.hidden=false;f.observers.visibilitychange();assert.equal(f.queue.size,1);
  console.log('Progress: loop/reverse, idle movement, resize/DPR, structure changes and visibility pass. Stable-frame index and track reads: 0.');
}
if(require.main===module)run();
module.exports={fixture};
