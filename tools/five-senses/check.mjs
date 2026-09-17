import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../src/five-senses/five-senses.js',import.meta.url),'utf8');
const {TransitionQueue,Soundscape,breezeBuffer}=await import(`data:text/javascript;base64,${Buffer.from(source.replace(/^import .*;\n/,'')).toString('base64')}`);
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
  return {parentNode:null,children:[],attachments:0,dataset:{},animations:[],
    get isConnected(){return this.root||!!this.parentNode?.isConnected;},
    remove(){if(this.parentNode){const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;}},
    append(...nodes){for(const n of nodes){n.remove();this.children.push(n);n.parentNode=this;n.attachments++;}},
    insertBefore(n,reference){n.remove();this.children.splice(this.children.indexOf(reference),0,n);n.parentNode=this;n.attachments++;},
    replaceChildren(...nodes){for(const child of [...this.children])child.remove();this.append(...nodes);},
    cloneNode(){return node();},getAnimations(){return this.animations;},
    classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},
    style:{setProperty:(k,v)=>styleValues.set(k,v),removeProperty:k=>styleValues.delete(k),getPropertyValue:k=>styleValues.get(k)}};
}
globalThis.document={createElement:()=>node(),timeline:{currentTime:5000}};
const cold={node:node(),state:{sight:false},photo:{querySelectorAll:()=>[]}},warm={node:node(),state:{sight:true},photo:{querySelectorAll:()=>[]}};
const stage=node();stage.root=true;stage.append(cold.node);
const animation=()=>({effect:{target:{matches:()=>true}},currentTime:0,startTime:null,playState:'running',play(){this.playState='running';},pause(){this.playState='paused';}});
cold.node.animations=[animation()];warm.node.animations=[animation()];
const renderer=Object.assign(Object.create(SceneRenderer.prototype),{stage,current:cold,active:null,width:390,height:844,disposed:false,motionEpoch:2000,motionHeld:0,paused:false,scene:state=>state.sight?warm:cold,prune(){}});
const origin={x:44,y:770};
const forward=renderer.reveal({sight:true},origin,{duration:1600,reduced:false});
assert.deepEqual(stage.children.slice(0,2),[cold.node,warm.node]);
assert.equal(warm.node.animations[0].currentTime,3000,'A new scene must join the existing ambient clock');
assert.equal(warm.node.animations[0].startTime,2000);
assert.ok(warm.node.classList.contains('tdb-senses-revealing'));
assert.equal(warm.node.style.getPropertyValue('--tdb-senses-reveal-radius'),'-12px');
renderer.finish();assert.equal(await forward,true);assert.deepEqual(stage.children,[warm.node]);
assert.equal(warm.node.attachments,1,'Settling must not detach/reinsert the visible scene and restart its effects');
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
document.timeline.currentTime=8000;renderer.motion(true);
assert.equal(cold.node.animations[0].currentTime,6000);assert.equal(cold.node.animations[0].playState,'paused');
document.timeline.currentTime=12000;
const pausedReveal=renderer.reveal({sight:true},origin,{duration:1200,reduced:false,doublePulse:true});
assert.equal(warm.node.animations[0].currentTime,6000,'Toggling while paused must preserve the held ambient position');
assert.equal(warm.node.animations[0].playState,'paused');
assert.equal(stage.children.length,4,'The Sound introduction must keep both rings');
renderer.finish();await pausedReveal;renderer.motion(false);
assert.equal(renderer.motionEpoch,6000);assert.equal(warm.node.animations[0].startTime,6000);
assert.equal(warm.node.animations[0].playState,'running');
console.log('Passed: viewport coverage, expand/contract, double rings, cleanup, continuous/paused ambient phase, queued state coalescing, and late audio cancellation.');

// Scent is an independent gain: switching Sound must leave its automation intact.
const gainLog=()=>({value:0,events:[],cancelScheduledValues(){},cancelAndHoldAtTime(t){this.events.push(['hold',t]);},setValueAtTime(v,t){this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);},disconnect(){}});
const independent=new Soundscape('',new AbortController().signal,()=>{});
independent.context={currentTime:4,close:()=>Promise.resolve()};independent.ready=true;
independent.gains=[{gain:gainLog(),disconnect(){}},{gain:gainLog(),disconnect(){}}];
const breezeParam=gainLog();let disconnected=false;
independent.breezeGain={gain:breezeParam,disconnect(){disconnected=true;}};
independent.scent(true,1.2);assert.deepEqual(breezeParam.events.at(-1),['ramp',.12,5.2]);
const before=JSON.stringify(breezeParam.events);independent.transition(false);
assert.equal(JSON.stringify(breezeParam.events),before,'Sound OFF must not cut out the Scent layer');
independent.scent(false,.8);assert.deepEqual(breezeParam.events.at(-1),['ramp',0,4.8]);
independent.stop();assert.ok(disconnected);assert.equal(breezeParam.value,0);assert.equal(independent.breezeGain,null);
let channels;
breezeBuffer({createBuffer(n,length,rate){channels=Array.from({length:n},()=>new Float32Array(length));return{getChannelData:i=>channels[i]};}});
for(const channel of channels){
 assert.ok(channel.every(Number.isFinite));
 const rms=Math.sqrt(channel.reduce((a,v)=>a+v*v,0)/channel.length);
 assert.ok(rms>.01&&rms<.08,'The air layer must stay restrained');
 assert.ok(Math.abs(channel.at(-1)-channel[22050])<.06,'The loop boundary must not introduce a click');
}
console.log('Passed: independent Scent audio, fade targets, immediate cleanup and seamless quiet breeze buffer.');
