const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const code=fs.readFileSync(__dirname+'/../dist/tdb-drawer.js','utf8');
const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
function setup(){
 const dom=new JSDOM('<main><button id="review">Review</button></main><div data-tdb-drawer><div data-tdb-drawer-backdrop></div><div data-tdb-drawer-panel><button data-tdb-drawer-close>Close</button></div></div>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});
 const w=dom.window,doc=w.document,root=doc.querySelector('[data-tdb-drawer]'),panel=root.querySelector('[data-tdb-drawer-panel]'),backdrop=root.querySelector('[data-tdb-drawer-backdrop]'),trigger=doc.querySelector('#review'),animations=[],events=[];
 w.matchMedia=()=>({matches:false});w.TDBMotion={duration:()=>600,reduced:{matches:false,addEventListener(){}}};
 w.lenis={isStopped:false,stop(){this.isStopped=true;events.push('lock')},start(){this.isStopped=false;events.push('unlock')}};
 for(const node of [panel,backdrop])node.animate=(frames,options)=>{
  let resolve,reject;const animation={node,frames,options,currentTime:0,playbackRate:1,reversals:0,reverse(){this.playbackRate=-this.playbackRate;this.reversals++;if(this.done){this.done=false;this.finished=new Promise((a,b)=>{resolve=a;reject=b})}},done:false,cancelled:false,finished:new Promise((a,b)=>{resolve=a;reject=b}),finish(){if(!this.done){this.done=true;resolve()}},cancel(){this.cancelled=true;if(!this.done){this.done=true;reject(new w.DOMException('Cancelled','AbortError'))}}};
  animations.push(animation);return animation;
 };
 w.eval(code);const api=w.TDBDrawer.mount(root,{onOpen(){events.push('open')},onClose(){events.push('close')}});
 return{w,doc,root,panel,backdrop,trigger,animations,events,api,finish(){animations.filter(a=>!a.done).forEach(a=>a.finish())},dispose(){api.destroy();w.close()}};
}
test('backdrop, Escape and repeated close calls cannot restart a closing drawer',async()=>{
 const t=setup();try{
  const opening=t.api.open(t.trigger);t.finish();await opening;assert.equal(t.api.state,'open');
  const closing=t.api.close(),exit=t.animations.at(-2),count=t.animations.length;
  t.backdrop.click();t.root.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));t.api.close();await t.api.open(t.trigger);await flush();
  assert.equal(t.animations.length,count,'second dismiss must not replace the in-flight close animation');
  assert.equal(exit.cancelled,false,'closing panel keeps its current animation and progress');
  assert.equal(t.events.filter(x=>x==='close').length,1);assert.equal(t.api.state,'closing');
  assert.equal(t.doc.documentElement.style.overflow,'hidden');assert.equal(t.doc.querySelector('main').inert,true);
  t.finish();await closing;assert.equal(t.api.state,'closed');assert.equal(t.root.hidden,true);assert.equal(t.doc.documentElement.style.overflow,'');assert.equal(t.doc.activeElement,t.trigger);
  const reopening=t.api.open(t.trigger);assert.equal(t.api.state,'opening');t.finish();await reopening;assert.equal(t.api.state,'open');assert.equal(t.events.filter(x=>x==='open').length,2);
 }finally{t.dispose();}
});
test('immediate teardown during closing cancels once and restores page access',async()=>{
 const t=setup();try{
  const opening=t.api.open(t.trigger);t.finish();await opening;const closing=t.api.close();
  await t.api.close(true);await closing;
  assert.equal(t.events.filter(x=>x==='close').length,1,'teardown does not repeat consumer close work');
  assert.equal(t.events.filter(x=>x==='unlock').length,1);assert.equal(t.api.state,'closed');assert.equal(t.root.inert,true);assert.equal(t.doc.documentElement.style.overflow,'');
 }finally{t.dispose();}
});

for(const elapsed of [180,420])test(`closing during opening reverses at ${elapsed}ms without replacing animations`,async()=>{
 const t=setup();try{
  const opening=t.api.open(t.trigger),[panel,backdrop]=t.animations;
  panel.currentTime=elapsed;backdrop.currentTime=Math.min(elapsed,300);
  if(elapsed>=300)backdrop.finish();
  const closing=t.api.close();await flush();
  assert.equal(t.animations.length,2,'reuse the entrance animations, without snapping to a fresh fully-open frame');
  for(const animation of [panel,backdrop]){assert.equal(animation.cancelled,false);assert.equal(animation.playbackRate,-1);assert.equal(animation.reversals,1)}
  assert.equal(panel.currentTime,elapsed);assert.equal(backdrop.currentTime,Math.min(elapsed,300));
  t.backdrop.click();assert.equal(panel.reversals,1);assert.equal(t.api.state,'closing');
  panel.finish();await flush();assert.equal(t.api.state,'closing','wait for the reversed backdrop too');
  backdrop.finish();await Promise.all([opening,closing]);
  assert.equal(t.api.state,'closed');assert.equal(t.root.hidden,true);assert.equal(t.doc.activeElement,t.trigger);assert.equal(t.events.filter(x=>x==='unlock').length,1);
 }finally{t.dispose()}
});

test('closing before the first animation frame does not rewind to fully open',async()=>{
 const t=setup();try{
  const opening=t.api.open(t.trigger),[panel,backdrop]=t.animations;
  const closing=t.api.close();await Promise.all([opening,closing]);
  assert.equal(t.animations.length,2);assert.equal(panel.reversals,0);assert.equal(backdrop.reversals,0);
  assert.equal(panel.playbackRate,-1);assert.equal(panel.currentTime,0);assert.equal(t.api.state,'closed');
 }finally{t.dispose()}
});
