const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=name=>fs.readFileSync(path.join(__dirname,'../src/shared/'+name+'.js'),'utf8');
test('outside dismissal consumes the entire closing gesture and releases listeners on teardown',()=>{
 const dom=new JSDOM('<aside><button id="inside">Filter</button></aside><button id="outside">Open case</button>',{runScripts:'outside-only'}),w=dom.window;
 try{
  w.eval(source('filters'));const abort=new w.AbortController(),panel=w.document.querySelector('aside'),outside=w.document.querySelector('#outside');let active=true,closes=0,opens=0;
  outside.addEventListener('click',()=>opens++);
  w.TDBFilters.dismissOutside({contains:node=>panel.contains(node),isActive:()=>active,onDismiss:()=>{active=false;closes++;},signal:abort.signal});
  const pointer=type=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'pointerId',{value:7});return e;};
  outside.dispatchEvent(pointer('pointerdown'));assert.equal(closes,1);outside.dispatchEvent(pointer('pointerup'));outside.click();assert.equal(opens,0);
  outside.click();assert.equal(opens,1);active=true;panel.querySelector('button').click();assert.equal(active,true);
  abort.abort();outside.click();assert.equal(opens,2);assert.equal(active,true);
 }finally{w.close();}
});
test('region DD fades use the scroll viewport, settle without idle frames and restore native opacity',()=>{
 const dom=new JSDOM('<section><p style="opacity:.65">Treatment</p></section>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 try{
  const root=w.document.querySelector('section'),node=root.firstElementChild,frames=new Map();let sequence=0,intersect,disconnected=false;
  w.requestAnimationFrame=fn=>{frames.set(++sequence,fn);return sequence;};w.cancelAnimationFrame=id=>frames.delete(id);
  w.IntersectionObserver=class{constructor(callback,options){intersect=callback;assert.equal(options.root,root);}observe(){}disconnect(){disconnected=true;}};
  Object.defineProperty(root,'clientHeight',{value:600});root.getBoundingClientRect=()=>({top:100});node.getClientRects=()=>[{}];node.getBoundingClientRect=()=>({top:400,bottom:500,height:100});
  w.eval(source('motion'));const fade=w.TDBMotion.ddRegion([node],{root});intersect([{target:node,isIntersecting:true}]);
  let runs=0;while(frames.size&&runs++<100){const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn());}
  assert.ok(runs<100);assert.equal(frames.size,0);assert.ok(Math.abs(Number(node.style.opacity)-w.TDBMotion.ddOpacity(300/700))<.001);
  node.getBoundingClientRect=()=>({top:0,bottom:90,height:90});intersect([{target:node,isIntersecting:false}]);assert.equal(Number(node.style.opacity),w.TDBMotion.ddOpacity(1));
  fade.destroy();assert.equal(node.style.opacity,'0.65');assert.ok(disconnected);root.dispatchEvent(new w.Event('scroll'));assert.equal(frames.size,0);
 }finally{w.close();}
});
