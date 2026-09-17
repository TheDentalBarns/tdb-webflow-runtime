import {SceneRenderer} from './scene-renderer.js';
/* TDB Five Senses v0.16.0 — Surgery photographic proof of concept.
 * One registered scene, real old/new photographic circular masking.
 * No IX2, Swiper, analytics, persistence, or document-wide discovery loops.
 */
const DURATION = 1200;
const OFF_DURATION = 800;
const SENSES = ['sight', 'sound', 'smell', 'touch', 'taste'];
const LABELS = ['Sight', 'Sound', 'Smell', 'Touch', 'Taste'];
const DETAILS={
 sight:['Harsh clinical lighting and sterile colours.','Warm, high-quality lighting, without the glare.'],
 sound:['The familiar sounds of a clinical surgery.','Gentle birdsong and piano, for a calmer moment.'],
 smell:['A clinical atmosphere.','Fresh greenery and a softly scented candle.'],
 touch:['Cool, clinical surfaces.','Soft upholstery and warm, tactile finishes.'],
 taste:['Clinical dispensers and familiar surgery essentials.','A considered mouthwash ritual, with a more homely feel.']
};
const assetURL=(name,base)=>typeof base==='string'?new URL(name,base):base[name];
const ICONS = [
  '<path d="M3 16s4.5-8 13-8 13 8 13 8-4.5 8-13 8S3 16 3 16Z"/><circle cx="16" cy="16" r="4.5"/>',
  '<path d="M4 13v6m5-10v14m5-18v22m5-18v14m5-12v10m5-7v4"/>',
  '<path d="M9 28c1-9 6-16 16-23-1 11-4 17-14 17M16 14l1 8M15 16l-5-1"/>',
  '<path d="M10 16V7c0-3 4-3 4 0v8-10c0-3 4-3 4 0v10-8c0-3 4-3 4 0v10-5c0-3 4-3 4 0v9c0 7-5 10-10 10-3 0-5-1-7-4l-5-7c-2-3 1-5 3-3l3 3Z"/>',
  '<path d="M5 9h22v8c0 5-5 8-11 8S5 22 5 17V9Zm3 18h16M27 11h2c4 0 3 8-2 8"/>'
];
const svg = body => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export class TransitionQueue {
  constructor(initial) { this.visible = { ...initial }; this.active = null; this.pending = null; }
  request(state, origin, intro = false, sense = null) {
    const request = { state: { ...state }, origin, sense, intro: intro || !!(this.pending?.intro && state.sound) };
    if (this.active) { this.pending = request; return null; }
    return this.begin(request);
  }
  begin(request) {
    this.active = { from: { ...this.visible }, ...request, started: 0 };
    return this.active;
  }
  finish() {
    if (this.active) this.visible = { ...this.active.state };
    this.active = null;
    const pending = this.pending;
    this.pending = null;
    return pending ? this.begin(pending) : null;
  }
  cancel() { this.active = null; this.pending = null; }
}

export function isReverseTransition(active) {
  return active.sense ? !active.state[active.sense] : SENSES.some(sense => active.from[sense] && !active.state[sense]);
}

async function imageAsset(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Image unavailable');
  const blob = await response.blob();
  if (signal.aborted) throw new DOMException('Closed', 'AbortError');
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none' });
    if (signal.aborted) { bitmap.close(); throw new DOMException('Closed', 'AbortError'); }
    return bitmap;
  }
  const image = new Image();
  const objectURL = URL.createObjectURL(blob);
  try { image.src = objectURL; await image.decode(); return image; }
  finally { URL.revokeObjectURL(objectURL); }
}

// A quiet seamless air-rustle buffer, prepared once after the user's gesture.
// Periodic gust envelopes avoid a constant hiss; no continuous JavaScript work.
export function breezeBuffer(context) {
  const rate=22050,seconds=16,length=rate*seconds;
  const buffer=context.createBuffer(2,length,rate);
  for(let channel=0;channel<2;channel++){
    const data=buffer.getChannelData(channel);let low=0,slow=0,seed=1979+channel*101;
    for(let i=0;i<length;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      low=.88*low+.12*(seed/2147483648-1);slow=.995*slow+.005*low;
      const phase=2*Math.PI*i/length;
      const gust=.52+.26*Math.sin(phase+channel*.12)+.12*Math.sin(phase*3+.7);
      data[i]=(low-slow)*gust*.45;
    }
    // Equal-power wrap blend removes the buffer seam without fading to silence.
    const overlap=rate;
    for(let i=0;i<overlap;i++){
      const angle=i/overlap*Math.PI/2;
      data[length-overlap+i]=data[length-overlap+i]*Math.cos(angle)+data[i]*Math.sin(angle);
    }
  }
  return buffer;
}

export class Soundscape {
  constructor(base, signal, report) {
    this.base = base; this.signal = signal; this.report = report;
    this.context = null; this.sources = []; this.gains = []; this.generation = 0;
    this.ready = false; this.requested = null; this.bytes = null; this.breezeGain = null;
  }
  prefetch() {
    if (this.bytes) return this.bytes;
    this.bytes = Promise.all(['clinical.mp3', 'calm.mp3'].map(async name => {
      const response = await fetch(assetURL(name, this.base), { signal: this.signal });
      if (!response.ok) throw new Error('Audio unavailable');
      return response.arrayBuffer();
    })).catch(error => { this.bytes = null; throw error; });
    return this.bytes;
  }
  // Called directly inside the Sound button's activation event, before awaits.
  async unlock() {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) throw new Error('Audio is unavailable in this browser');
    const generation = ++this.generation;
    this.context = new AudioContextType();
    const context = this.context;
    const resumed = context.resume();
    this.report('preparing');
    const bytes = await this.prefetch();
    const decoded = await Promise.all(bytes.map(buffer => context.decodeAudioData(buffer.slice(0))));
    await resumed;
    if (generation !== this.generation || this.signal.aborted || context.state !== 'running') {
      try { await context.close(); } catch (_) {}
      throw new DOMException('Audio start cancelled', 'AbortError');
    }
    decoded.forEach(buffer => {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer; source.loop = true; gain.gain.value = 0;
      source.connect(gain); gain.connect(context.destination); source.start();
      this.sources.push(source); this.gains.push(gain);
    });
    const breeze=context.createBufferSource(),breezeGain=context.createGain();
    breeze.buffer=breezeBuffer(context);breeze.loop=true;breeze.loopStart=1;breeze.loopEnd=16;
    breezeGain.gain.value=0;breeze.connect(breezeGain);breezeGain.connect(context.destination);breeze.start(0,1);
    this.sources.push(breeze);this.breezeGain=breezeGain;
    this.ready = true; this.report('running');
  }
  transition(on, intro = false) {
    if (!this.ready || this.signal.aborted) return;
    const t = this.context.currentTime;
    this.requested = on;
    this.gains.forEach(g => {
      if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(t);
      else { const value = g.gain.value; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(value, t); }
    });
    const clinical = this.gains[0].gain, calm = this.gains[1].gain;
    if (on) {
      if(intro){clinical.setValueAtTime(0,t);}
      clinical.linearRampToValueAtTime(0,t+.15);
      calm.setValueAtTime(0,t);calm.setValueAtTime(0,t+.175);
      calm.linearRampToValueAtTime(.85,t+.775);
    } else {
      clinical.setValueAtTime(.65,t);calm.setValueAtTime(0,t);
    }
  }
  scent(on,duration=1.2) {
    if(!this.ready||this.signal.aborted||!this.breezeGain)return;
    const gain=this.breezeGain.gain,t=this.context.currentTime;
    if(gain.cancelAndHoldAtTime)gain.cancelAndHoldAtTime(t);
    else{const value=gain.value;gain.cancelScheduledValues(t);gain.setValueAtTime(value,t);}
    gain.linearRampToValueAtTime(on?.12:0,t+duration);
  }
  stop() {
    if(this.breezeGain){try{this.breezeGain.gain.cancelScheduledValues(0);this.breezeGain.gain.value=0;this.breezeGain.disconnect();}catch(_){}this.breezeGain=null;}
    this.generation++; this.ready = false;
    this.gains.forEach(g => { try { g.gain.cancelScheduledValues(0); g.gain.value = 0; g.disconnect(); } catch (_) {} });
    this.sources.forEach(s => { try { s.stop(); s.disconnect(); } catch (_) {} });
    this.sources = []; this.gains = [];
    const context = this.context; this.context = null;
    if (context) context.close().catch(() => {});
    this.report('stopped');
  }
}

export async function mountExperience({dialog,signal,assetBase,onClose}) {
  let disposed=false,renderer=null,audio=null,audioReady=false,audioPending=false,motionPaused=false,hasBegun=false,interactionReady=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const initial={sight:true,sound:false,smell:true,touch:true,taste:true};
  const requested={...initial},queue=new TransitionQueue(initial),scope=new AbortController();
  const listen=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:scope.signal});
  const loaded=await Promise.allSettled(['surgery-warm.webp','surgery-clinical-clean.webp','surgery-objects.webp','scent-candle.webp','taste-clinical.webp'].map(name=>imageAsset(assetURL(name,assetBase),signal)));
  if(signal.aborted||loaded.some(r=>r.status==='rejected')){
    loaded.forEach(r=>{if(r.status==='fulfilled')r.value.close?.();});
    throw new Error(signal.aborted?'Closed':'The photograph could not load. Please try again.');
  }
  const images={warm:loaded[0].value,clinical:loaded[1].value,objects:loaded[2].value,candle:loaded[3].value,tasteClinical:loaded[4].value};
  let artwork;
  try{artwork=await SceneRenderer.prepareAssets(images,signal);}
  catch(error){Object.values(images).forEach(image=>image.close?.());throw error;}
  dialog.classList.add('tdb-senses');dialog.dataset.audioState='uninitiated';dialog.dataset.scene='surgery';dialog.dataset.phase='ready';dialog.dataset.version='0.16.0';
  dialog.innerHTML=`<div class="tdb-senses-stage" aria-hidden="true"></div><div class="tdb-senses-shade" aria-hidden="true"></div>
    <header class="tdb-senses-top"><div class="tdb-senses-room">Surgery<span aria-hidden="true"></span></div><div class="tdb-senses-utilities">
    <button type="button" class="tdb-senses-motion" aria-label="Pause ambient motion" aria-pressed="false">${svg('<path d="M12 9v14M20 9v14"/>')}</button>
    <button type="button" class="tdb-senses-close" aria-label="Close experience">${svg('<path d="m9 9 14 14M23 9 9 23"/>')}</button></div></header>
    <h2 id="tdb-senses-title" class="tdb-senses-title">Every sense,<br>considered.</h2>
    <div class="tdb-senses-detail" hidden><p class="tdb-senses-detail-name"></p><p class="tdb-senses-detail-copy"></p></div>
    <p id="tdb-senses-description" class="tdb-senses-sr">Explore the Surgery. Each control switches one considered detail on or off. Sound starts only when you activate Start. Sound off plays the conventional soundscape. Close stops all audio. Escape closes the experience.</p>
    <button type="button" class="tdb-senses-start" aria-label="Start experience with sound"><span class="tdb-senses-circle">${svg('<path d="M5 12h5l7-6v20l-7-6H5Z M21 11q5 5 0 10 M24 7q9 9 0 18"/>')}</span><span class="tdb-senses-start-label">START</span></button>
    <div class="tdb-senses-controls" role="group" aria-label="Five senses">${SENSES.map((sense,i)=>`<button type="button" class="tdb-senses-control" data-sense="${sense}" aria-label="${sense==='sound'?'Begin sound experience':LABELS[i]}" aria-pressed="${initial[sense]}"><span class="tdb-senses-circle">${svg(ICONS[i])}</span><span class="tdb-senses-name">${LABELS[i]}</span><span class="tdb-senses-value">${sense==='sound'?'':initial[sense]?'ON':'OFF'}</span></button>`).join('')}</div>
    <p class="tdb-senses-message" aria-live="polite"></p><p class="tdb-senses-sr tdb-senses-announcement" aria-live="polite"></p>`;
  dialog.setAttribute('aria-labelledby','tdb-senses-title');dialog.setAttribute('aria-describedby','tdb-senses-description');
  const controls=Array.from(dialog.querySelectorAll('[data-sense]'));
  const announcement=dialog.querySelector('.tdb-senses-announcement'),message=dialog.querySelector('.tdb-senses-message'),motion=dialog.querySelector('.tdb-senses-motion');
  const stage=dialog.querySelector('.tdb-senses-stage'),startButton=dialog.querySelector('.tdb-senses-start');
  renderer=new SceneRenderer(stage,images,stats=>{dialog.dataset.sceneBuilds=String(stats.builds);dialog.dataset.lastBuildMs=String(stats.buildMs);},artwork);
  renderer.render(initial);
  const createAudio=()=>new Soundscape(assetBase,signal,state=>{dialog.dataset.audioState=state;});
  audio=createAudio();audio.prefetch().catch(()=>{});

  function updateControls(){
    controls.forEach((button,i)=>{
      button.disabled=!interactionReady;
      const sense=SENSES[i],value=!!requested[sense];button.setAttribute('aria-pressed',String(value));
      button.dataset.state=sense==='sound'&&!audioReady?'pending':value?'on':'off';
      button.querySelector('.tdb-senses-value').textContent=value?'ON':'OFF';
      if(sense==='sound'){button.setAttribute('aria-label',audioReady?'Sound':'Begin sound experience');button.setAttribute('aria-busy',String(audioPending));}
    });
    startButton.hidden=hasBegun;startButton.disabled=audioPending;startButton.setAttribute('aria-busy',String(audioPending));
    startButton.querySelector('.tdb-senses-start-label').textContent=audioPending?'STARTING…':'START';
    dialog.classList.toggle('tdb-senses-awaiting-sound',!audioReady);dialog.classList.toggle('tdb-senses-has-begun',hasBegun);
    motion.hidden=reduced.matches;motion.setAttribute('aria-pressed',String(motionPaused));motion.setAttribute('aria-label',motionPaused?'Resume ambient motion':'Pause ambient motion');
    motion.innerHTML=svg(motionPaused?'<path d="m12 8 13 8-13 8V8Z"/>':'<path d="M12 9v14M20 9v14"/>');
    renderer.motion(motionPaused||reduced.matches||document.hidden);
  }
  function begin(active){
    if(!active||disposed)return;
    const reverse=isReverseTransition(active);
    const duration=reduced.matches?180:reverse?OFF_DURATION:DURATION;
    dialog.dataset.transitionDirection=reverse?'contract':'expand';
    dialog.dataset.phase='transition';dialog.dataset.transitionProgress='0';dialog.dataset.transitionStarted=String(Math.round(performance.now()));
    if(audioReady&&(active.intro||active.from.sound!==active.state.sound))audio.transition(active.state.sound,active.intro);
    if(audioReady&&(active.intro||active.from.smell!==active.state.smell)){audio.scent(active.state.smell,duration/1000);dialog.dataset.scentAudio=active.state.smell?'on':'off';}
    const started=performance.now();
    renderer.reveal(active.state,active.origin,{duration,reverse,doublePulse:!reverse&&active.state.sound&&!active.from.sound,reduced:reduced.matches,onProgress:p=>{dialog.dataset.transitionProgress=String(p);}}).then(complete=>{
      if(!complete||disposed||signal.aborted||queue.active!==active)return;
      dialog.dataset.lastTransitionMs=String(Math.round(performance.now()-started));
      const pending=queue.finish();dialog.dataset.phase='ready';dialog.dataset.transitionProgress='1';
      dialog.dataset.visibleState=JSON.stringify(queue.visible);
      if(active.intro){interactionReady=true;updateControls();controls[1].focus({preventScroll:true});}
      if(pending)begin(pending);
    });
  }
  function activate(sense,button,intro=false){
    const rect=button.querySelector('.tdb-senses-circle').getBoundingClientRect(),bounds=stage.getBoundingClientRect();
    const origin={x:rect.left+rect.width/2-bounds.left,y:rect.top+rect.height/2-bounds.top};
    const detail=dialog.querySelector('.tdb-senses-detail');detail.hidden=intro;
    detail.querySelector('.tdb-senses-detail-name').textContent=LABELS[SENSES.indexOf(sense)];
    detail.querySelector('.tdb-senses-detail-copy').textContent=(requested[sense]?'After — ':'Before — ')+DETAILS[sense][Number(requested[sense])];
    hasBegun=true;updateControls();begin(queue.request(requested,origin,intro,sense));
    announcement.textContent=`${LABELS[SENSES.indexOf(sense)]} ${requested[sense]?'on':'off'}.`;
  }
  listen(startButton,'click',async()=>{
    if(audioPending||hasBegun)return;
    message.textContent='';audioPending=true;updateControls();const attempt=audio;
    try{
      await attempt.unlock();if(disposed||signal.aborted||audio!==attempt)return;
      audioReady=true;requested.sound=true;activate('sound',startButton,true);
    }catch(error){
      if(disposed||signal.aborted||audio!==attempt)return;
      audio.stop();audio=createAudio();audioPending=false;message.textContent='Sound could not start. Tap START to try again.';dialog.dataset.audioState='uninitiated';
    }finally{if(audio===attempt)audioPending=false;if(!disposed)updateControls();}
  });
  controls.forEach((button,i)=>listen(button,'click',()=>{
    if(!interactionReady)return;
    const sense=SENSES[i];message.textContent='';
    requested[sense]=!requested[sense];activate(sense,button);
  }));
  listen(dialog.querySelector('.tdb-senses-close'),'click',onClose);
  listen(motion,'click',()=>{motionPaused=!motionPaused;updateControls();});
  listen(dialog,'keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!event.target.closest('[data-sense]'))return;
    event.preventDefault();const current=controls.indexOf(event.target.closest('[data-sense]'));
    controls[event.key==='Home'?0:event.key==='End'?4:(current+(event.key==='ArrowRight'?1:4))%5].focus();
  });
  const resize=new ResizeObserver(()=>{if(!disposed)renderer.resize();});resize.observe(stage);
  listen(reduced,'change',()=>{renderer.finish();updateControls();});
  listen(document,'visibilitychange',()=>{
    if(document.hidden){
      audio.stop();audio=createAudio();audioReady=false;audioPending=false;requested.sound=false;hasBegun=false;interactionReady=false;dialog.querySelector('.tdb-senses-detail').hidden=true;
      queue.cancel();queue.visible={...requested};renderer.render(requested);dialog.dataset.audioState='uninitiated';dialog.dataset.scentAudio='off';dialog.dataset.phase='ready';dialog.dataset.transitionProgress='1';
    }
    updateControls();
  });
  const cleanup=()=>{
    if(disposed)return;disposed=true;queue.cancel();audio.stop();scope.abort();resize.disconnect();renderer.destroy();Object.values(images).forEach(image=>image.close?.());
  };
  signal.addEventListener('abort',cleanup,{once:true});
  dialog.dataset.visibleState=JSON.stringify(initial);updateControls();
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(signal.aborted){cleanup();return;}
  dialog.classList.add('tdb-senses-ready');startButton.focus({preventScroll:true});return{cleanup};
}
