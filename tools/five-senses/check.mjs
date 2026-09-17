import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../src/five-senses/five-senses.js',import.meta.url),'utf8');
const {SenseTransitions,Soundscape}=await import(`data:text/javascript;base64,${Buffer.from(source.replace(/^import .*;\n/,'')).toString('base64')}`);
const sceneSource=await readFile(new URL('../../src/five-senses/scene-renderer.js',import.meta.url),'utf8');
const {coverGeometry,revealRadius,SceneRenderer,RippleField,rippleEase}=await import(`data:text/javascript;base64,${Buffer.from(sceneSource).toString('base64')}`);
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
const queue=new SenseTransitions(initial);
const a=queue.request({...initial,touch:false},{x:100,y:700},false,'touch');
const b=queue.request({...initial,touch:false,sight:false},{x:0,y:700},false,'sight');
const c=queue.request({...initial,touch:false,sight:false,taste:false},{x:600,y:700},false,'taste');
assert.equal(queue.active.size,3,'Consecutive taps must all start immediately');
queue.finish(b);assert.equal(queue.visible.sight,false);assert.equal(queue.visible.touch,true,'One completion must not settle other active senses');
queue.finish(c);queue.finish(a);assert.deepEqual(queue.visible,{...initial,touch:false,sight:false,taste:false});
const stale=queue.request({...initial,sound:true},{x:100,y:700},false,'sound');
const latest=queue.request(initial,{x:100,y:700},false,'sound');
assert.equal(queue.finish(stale),false,'A superseded completion cannot overwrite the latest tap');
assert.equal(queue.active.get('sound'),latest);queue.cancel();assert.equal(queue.active.size,0);
assert.equal(rippleEase(0),0);assert.equal(rippleEase(1),1);
assert.ok(rippleEase(.25)>.4&&rippleEase(.25)<.55);
assert.ok(rippleEase(.5)-rippleEase(.25)>rippleEase(.75)-rippleEase(.5),'The wave must decelerate smoothly');
const field=new RippleField(initial),origin={x:44,y:770};
field.start('sight',false,origin,900,0,{duration:800});
const radiusBefore=field.sample('sight',320).radius;
field.start('sight',true,origin,900,320,{duration:1200});
assert.equal(field.sample('sight',320).radius,radiusBefore,'Retapping must reverse from the current radius without jumping');
field.start('touch',false,{x:300,y:770},900,350,{duration:800});
assert.equal(field.waves.size,2);assert.equal(field.sample('touch',350).radius,900);
field.settle('touch');assert.equal(field.state.touch,false);assert.equal(field.waves.size,1);
for(let i=0;i<100;i++)field.start('sight',!!(i%2),origin,900,400+i,{duration:1200});
assert.equal(field.waves.size,1,'Rapid re-taps must not accumulate textures or wave histories');

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
// Exercise the actual renderer scheduler without a GPU: one RAF for all senses,
// independent completion, reversal, reduced motion, resize settlement and cleanup.
const frames=new Map();let frameID=0,clock=1000;
globalThis.requestAnimationFrame=callback=>{frames.set(++frameID,callback);return frameID;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
let lastSamples,draws=0;
const stage={dataset:{},classList:{toggle(){}},replaceChildren(){}};
const renderer=Object.assign(Object.create(SceneRenderer.prototype),{stage,field:new RippleField(initial),requests:new Map(),layers:[],rings:[],photos:[],frame:0,timer:0,width:390,height:844,disposed:false,stats:{draws:0,maxCPU:0},gpu:{draw(samples){lastSamples=samples;draws++;}}});
const sight=renderer.reveal({...initial,sight:false},origin,{sense:'sight',duration:800});
clock+=100;
const touch=renderer.reveal({...initial,touch:false},{x:300,y:770},{sense:'touch',duration:800});
clock+=100;
const smell=renderer.reveal({...initial,smell:false},{x:200,y:770},{sense:'smell',duration:800});
assert.equal(renderer.requests.size,3);assert.equal(frames.size,1,'There must be one shared animation callback, not one per ripple');
assert.equal(stage.dataset.peakRipples,'3');
clock=1850;renderer.draw(clock);assert.equal(await sight,true);assert.equal(renderer.requests.size,2);
assert.equal(lastSamples[0].amount,0);assert.ok(lastSamples[2].radial&&lastSamples[3].radial);
clock=1950;renderer.draw(clock);assert.equal(await touch,true);assert.equal(renderer.requests.size,1);
clock=2050;renderer.draw(clock);assert.equal(await smell,true);assert.equal(renderer.requests.size,0);assert.equal(frames.size,0);assert.equal(renderer.timer,0);
const sounding=renderer.reveal({...initial,sound:true},origin,{sense:'sound',duration:1200,doublePulse:true});
clock+=90;renderer.draw(clock);assert.equal(lastSamples[1].echo,null);assert.ok(lastSamples[1].progress>0,'Headphones reveal with the first pulse');
clock+=560;renderer.draw(clock);assert.ok(lastSamples[1].echo,'Second pulse starts after 600ms');
const retap=renderer.reveal({...initial,sound:false},origin,{sense:'sound',duration:800});
assert.equal(await sounding,false);assert.equal(renderer.requests.size,1);
renderer.finish();assert.equal(await retap,true);assert.equal(renderer.field.state.sound,false);assert.equal(frames.size,0);
const reduced=renderer.reveal({...initial,sight:true},origin,{sense:'sight',duration:180,reduced:true});
clock+=90;renderer.draw(clock);assert.equal(lastSamples[0].radial,false);assert.equal(lastSamples[0].ring,0);assert.ok(lastSamples[0].amount>0&&lastSamples[0].amount<1);
renderer.finish();assert.equal(await reduced,true);
const closing=renderer.reveal({...initial,taste:false},origin,{sense:'taste',duration:800});renderer.cancel();assert.equal(await closing,false);assert.equal(frames.size,0);assert.equal(renderer.timer,0);
console.log('Passed: viewport coverage, independent concurrent reveals, stale completion protection, organic easing, continuous reversal, double Sound pulse, reduced motion, idle scheduling and cancellation.');

// Only the two Sound soundscapes are created: Smell has no audio source.
const gainLog=()=>({value:0,events:[],cancelScheduledValues(){},cancelAndHoldAtTime(t){this.events.push(['hold',t]);},setValueAtTime(v,t){this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);},disconnect(){}});
class ReadyAudioContext extends FakeAudioContext{
  decodeAudioData(){return Promise.resolve({});}
  createGain(){return{gain:gainLog(),connect(){},disconnect(){}};}
}
window.AudioContext=ReadyAudioContext;
const playback=new Soundscape('',new AbortController().signal,()=>{});
playback.prefetch=()=>Promise.resolve([new ArrayBuffer(1),new ArrayBuffer(1)]);
await playback.unlock();assert.equal(playback.sources.length,2,'Only clinical and calm Sound tracks should be started');
playback.transition(true,true);assert.deepEqual(playback.gains[1].gain.events.at(-1).slice(0,2),['ramp',.85]);assert.ok(Math.abs(playback.gains[1].gain.events.at(-1)[2]-.775)<1e-9);
playback.transition(false);assert.deepEqual(playback.gains[0].gain.events.at(-1),['ramp',.65,.12]);
assert.deepEqual(playback.gains[1].gain.events.at(-1),['ramp',0,.12]);
playback.transition(true);
assert.deepEqual(playback.gains[0].gain.events.at(-1),['ramp',0,.35],'Road and clinical noise fade on the first pulse');
assert.deepEqual(playback.gains[1].gain.events.slice(-3),[['set',0,0],['set',0,.6],['ramp',.85,1.2]],'Calm stays silent until the second pulse');
const calmEvents=playback.gains[1].gain.events.length;
playback.setMuted(true);assert.deepEqual(playback.master.gain.events.at(-1),['ramp',0,.04]);
assert.equal(playback.gains[1].gain.events.length,calmEvents,'Mute must preserve scheduled second-wave music');
playback.transition(false);assert.equal(playback.muted,true,'Sense changes must not override master mute');
playback.setMuted(false);assert.deepEqual(playback.master.gain.events.at(-1),['ramp',1,.04]);
playback.stop();assert.equal(playback.master,null);assert.equal(playback.sources.length,0);assert.equal(playback.gains.length,0);assert.equal(playback.context,null);
console.log('Passed: only two Sound tracks, calm/clinical targets, immediate cleanup and late decode cancellation.');

const edgeField=new RippleField({sight:false,sound:false,smell:false,touch:false,taste:false});
edgeField.start('sound',true,{x:100,y:100,radius:29},900,0,{duration:1200,doublePulse:true});
assert.equal(edgeField.sample('sound',0).radius,29);
assert.equal(edgeField.sample('sound',0).echo,null);
assert.equal(edgeField.sample('sound',600).echo.radius,29);
edgeField.settle('sound');
assert.equal(edgeField.start('sound',false,{x:100,y:100,radius:29},900,2000,{duration:800}).to,29);
console.log('Passed: main and echo waves originate and contract at the button edge.');
