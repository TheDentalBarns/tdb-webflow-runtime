import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../src/five-senses/five-senses.js',import.meta.url),'utf8');
const {TransitionQueue,Soundscape}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
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
console.log('Passed: true pending/visible state separation, rapid-tap coalescing, cancellation and late audio decode cleanup.');
