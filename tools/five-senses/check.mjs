import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../src/five-senses/five-senses.js',import.meta.url),'utf8');
const {TransitionQueue,Soundscape,isReverseTransition}=await import(`data:text/javascript;base64,${Buffer.from(source.replace(/^import .*;\n/,'')).toString('base64')}`);
const sceneSource=await readFile(new URL('../../src/five-senses/scene-renderer.js',import.meta.url),'utf8');
const {coverGeometry,revealRadius,SceneRenderer}=await import(`data:text/javascript;base64,${Buffer.from(sceneSource).toString('base64')}`);
for(const [w,h] of [[320,568],[390,844],[412,915],[768,1024],[1363,936],[1920,1080],[2560,1440]]){
  const photo=coverGeometry(w,h);
  assert.ok(photo.x<=0&&photo.y<=0&&photo.x+photo.width>=w-.01&&photo.y+photo.height>=h-.01,'The crop must fill every edge');
  assert.ok(Math.abs(photo.width/photo.height-.75)<.00001,'The photograph must retain its aspect ratio');
  for(const x of [.05,.275,.5,.725,.95]){
    const origin={x:w*x,y:h*.9},radius=revealRadius(w,h,origin,20);
    for(const [cx,cy] of [[0,0],[w,0],[0,h],[w,h]])assert.ok(radius-10>Math.hypot(cx-origin.x,cy-origin.y),'The opaque part of the mask must pass every viewport corner');
  }
}
const initial={sight:true,sound:false,smell:true,touch:true,taste:true};
const queue=new TransitionQueue(initial);
const first=queue.request({...initial,touch:false},{x:100,y:700});
assert.equal(first.from.touch,true);
assert.equal(queue.visible.touch,true,'Visible surface must not change before the mask finishes');
const second={...initial,touch:false,sight:false};
queue.request(second,{x:0,y:700});
const latest={...second,taste:false};
queue.request(latest,{x:600,y:700});
assert.equal(queue.active,first,'A rapid second tap must not replace the active masked photograph');
const next=queue.finish();
assert.equal(queue.visible.touch,false);
assert.equal(next.from.sight,true);
assert.equal(next.state.sight,false);
assert.equal(next.state.taste,false);
assert.deepEqual(next.origin,{x:600,y:700});
queue.finish();assert.deepEqual(queue.visible,latest);
queue.request(initial,{x:0,y:0});queue.request(latest,{x:0,y:0});queue.cancel();
assert.equal(queue.active,null);assert.equal(queue.pending,null);
for(const sense of ['sight','sound','smell','touch','taste']){
  const q=new TransitionQueue({[sense]:true});
  assert.equal(isReverseTransition(q.request({[sense]:false},{x:1,y:2},false,sense)),true,`${sense} OFF must contract`);
  q.finish();
  assert.equal(isReverseTransition(q.request({[sense]:true},{x:1,y:2},false,sense)),false,`${sense} ON must expand`);
}
const scheduled=[[],[]],mix=new Soundscape('',{aborted:false},()=>{});
mix.ready=true;mix.context={currentTime:10};
mix.gains=scheduled.map(events=>({gain:{cancelAndHoldAtTime(){},setValueAtTime:(value,time)=>events.push({kind:'set',value,time}),linearRampToValueAtTime:(value,time)=>events.push({kind:'ramp',value,time})}}));
mix.transition(true);
assert.equal(scheduled[0].at(-1).value,0);
assert.ok(scheduled[0].at(-1).time<scheduled[1].at(-2).time,'Clinical sound must reach silence before the second pulse introduces calm sound');
assert.ok(scheduled[1].at(-1).time<=10.8,'Sound fade should finish with the faster reveal');
mix.transition(false);
assert.deepEqual(scheduled.map(events=>events.at(-1)),[{kind:'set',value:.65,time:10},{kind:'set',value:0,time:10}],'Sound OFF must switch audio immediately');

let release;
let sourceStarts=0;
class FakeAudioContext {
  state='running';currentTime=0;
  resume(){return Promise.resolve();}
  decodeAudioData(){return new Promise(resolve=>{release=resolve;});}
  close(){this.state='closed';return Promise.resolve();}
  createBufferSource(){return {connect(){},start(){sourceStarts++;},stop(){},disconnect(){}};}
  createGain(){return {gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
}
globalThis.window={AudioContext:FakeAudioContext};
const controller=new AbortController();const reports=[];
const sound=new Soundscape('https://example.invalid/',controller.signal,state=>reports.push(state));
// A single controlled decode is sufficient to reproduce a close-during-decode race.
sound.prefetch=()=>Promise.resolve([new ArrayBuffer(1)]);
const unlock=sound.unlock();await Promise.resolve();await Promise.resolve();
sound.stop();controller.abort();release({});
await assert.rejects(unlock,{name:'AbortError'});
assert.equal(sourceStarts,0,'Closing while decoding must never create a late playing source');
assert.equal(sound.context,null);assert.equal(sound.ready,false);
assert.deepEqual(reports,['preparing','stopped']);
// Exercise the real reveal method: OFF must mask the outgoing warm photograph,
// shrink it over the new cold photograph, then remove the mask entirely.
const frames=new Map();let frameID=0;
globalThis.requestAnimationFrame=callback=>{frames.set(++frameID,callback);return frameID;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function node(){
  const classes=new Set(),styleValues=new Map();
  return {remove(){},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},style:{setProperty:(k,v)=>styleValues.set(k,v),removeProperty:k=>styleValues.delete(k),getPropertyValue:k=>styleValues.get(k)}};
}
globalThis.document={createElement:()=>node()};
const cold={node:node(),state:{sight:false},photo:{querySelectorAll:()=>[]}},warm={node:node(),state:{sight:true},photo:{querySelectorAll:()=>[]}};
const stage={dataset:{},children:[cold.node],replaceChildren(...nodes){this.children=nodes;},append(n){this.children.push(n);}};
const renderer=Object.assign(Object.create(SceneRenderer.prototype),{stage,current:cold,active:null,width:390,height:844,disposed:false,scene:state=>state.sight?warm:cold,prune(){}});
const origin={x:44,y:770};
const forward=renderer.reveal({sight:true},origin,{duration:1600,reduced:false});
assert.deepEqual(stage.children.slice(0,2),[cold.node,warm.node]);
assert.ok(warm.node.classList.contains('tdb-senses-revealing'));
assert.equal(warm.node.style.getPropertyValue('--tdb-senses-reveal-radius'),'-12px');
renderer.finish();assert.equal(await forward,true);assert.deepEqual(stage.children,[warm.node]);
assert.ok(!warm.node.classList.contains('tdb-senses-revealing'));
const reverse=renderer.reveal({sight:false},origin,{duration:1600,reverse:true,reduced:false});
assert.deepEqual(stage.children.slice(0,2),[cold.node,warm.node],'Cold must sit below the outgoing warm circle');
const full=parseFloat(warm.node.style.getPropertyValue('--tdb-senses-reveal-radius'));
assert.ok(full>Math.hypot(390-44,770));
assert.ok(warm.node.classList.contains('tdb-senses-revealing'),'The outgoing photograph itself must be masked');
assert.ok(!cold.node.classList.contains('tdb-senses-revealing'));
frames.get(renderer.active.frame)(performance.now()+800);
const half=parseFloat(warm.node.style.getPropertyValue('--tdb-senses-reveal-radius'));
assert.ok(half>0&&half<full*.6,'OFF radius must shrink');
frames.get(renderer.active.frame)(performance.now()+1700);
assert.equal(await reverse,true);assert.deepEqual(stage.children,[cold.node]);
assert.ok(!warm.node.classList.contains('tdb-senses-revealing'));
const cancelled=renderer.reveal({sight:true},origin,{duration:1600,reduced:false});renderer.active.finish(false);
assert.equal(await cancelled,false);assert.deepEqual(stage.children,[cold.node]);
assert.ok(!warm.node.classList.contains('tdb-senses-revealing'));
console.log('Passed: viewport coverage, real photograph expand/contract and cleanup, pending state coalescing, and late audio decode cancellation.');
