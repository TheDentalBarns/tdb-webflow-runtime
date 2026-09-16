/* Prepared photographic scenes. Only the reveal mask and shadow transforms animate. */
const PHOTO_WIDTH=1086,PHOTO_HEIGHT=1448;
let shadowID=0;

export function coverGeometry(width,height){
  const scale=Math.max(width/PHOTO_WIDTH,height/PHOTO_HEIGHT);
  const w=PHOTO_WIDTH*scale,h=PHOTO_HEIGHT*scale;
  // Preserve the worktop in landscape; use the same crop for every sense state.
  return {x:Math.min(0,(width-w)*.5),y:Math.min(0,(height-h)*.04),width:w,height:h};
}

export function revealRadius(width,height,origin,feather=20){
  return Math.ceil(Math.max(
    Math.hypot(origin.x,origin.y),Math.hypot(width-origin.x,origin.y),
    Math.hypot(origin.x,height-origin.y),Math.hypot(width-origin.x,height-origin.y)
  )+feather+4);
}

function contactShadow(ctx,x,y,radius,alpha,squash=.18){
  ctx.save();ctx.translate(x,y);ctx.scale(1,squash);
  const gradient=ctx.createRadialGradient(0,0,radius*.16,0,0,radius);
  gradient.addColorStop(0,`rgba(16,14,10,${alpha})`);gradient.addColorStop(1,'rgba(16,14,10,0)');
  ctx.fillStyle=gradient;ctx.fillRect(-radius,-radius,radius*2,radius*2);ctx.restore();
}

function coldLighting(ctx){
  // This grading and all glare are baked once, never filtered during the reveal.
  ctx.save();ctx.globalCompositeOperation='copy';ctx.filter='saturate(.79) contrast(1.12) brightness(.96)';
  ctx.drawImage(ctx.canvas,0,0);ctx.restore();
  ctx.save();ctx.globalCompositeOperation='color';ctx.fillStyle='rgba(126,163,204,.20)';ctx.fillRect(0,0,PHOTO_WIDTH,PHOTO_HEIGHT);ctx.restore();

  // Hard, static window-frame shadows across the exposed floor.
  ctx.save();ctx.beginPath();ctx.moveTo(0,653);ctx.lineTo(384,566);ctx.lineTo(425,854);ctx.lineTo(220,1210);ctx.lineTo(0,1435);ctx.closePath();ctx.clip();
  ctx.fillStyle='rgba(19,30,42,.19)';
  ctx.beginPath();ctx.moveTo(89,615);ctx.lineTo(108,610);ctx.lineTo(401,1398);ctx.lineTo(370,1415);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(0,970);ctx.lineTo(0,955);ctx.lineTo(469,833);ctx.lineTo(477,854);ctx.closePath();ctx.fill();ctx.restore();

  // A clinical white LED directly beneath the registered front worktop lip.
  // Its narrow core, bloom and downward spill share the counter's perspective.
  const start={x:373,y:239},end={x:1085,y:287};
  ctx.save();ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x,445);ctx.lineTo(start.x,383);ctx.closePath();ctx.clip();
  const spill=ctx.createLinearGradient(0,240,0,425);spill.addColorStop(0,'rgba(198,222,249,.43)');spill.addColorStop(.3,'rgba(198,222,249,.17)');spill.addColorStop(1,'rgba(198,222,249,0)');
  ctx.globalCompositeOperation='screen';ctx.fillStyle=spill;ctx.fillRect(365,235,725,215);ctx.restore();
  ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='butt';
  for(const [width,blur,colour] of [[15,27,'rgba(157,196,240,.40)'],[7,12,'rgba(200,226,253,.78)'],[2.7,3,'rgba(247,253,255,.98)']]){
    ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.shadowBlur=blur;ctx.shadowColor=colour;
    ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();
  }
  ctx.restore();
  // Local hard reflection near the sink; retain the photograph's material colours.
  ctx.save();ctx.globalCompositeOperation='screen';
  const glare=ctx.createRadialGradient(660,190,5,660,190,150);
  glare.addColorStop(0,'rgba(211,229,250,.16)');glare.addColorStop(1,'rgba(211,229,250,0)');
  ctx.fillStyle=glare;ctx.fillRect(500,90,320,230);ctx.restore();
}

function makeSurface(images,state){
  const canvas=document.createElement('canvas');canvas.width=PHOTO_WIDTH;canvas.height=PHOTO_HEIGHT;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.drawImage(state.touch?images.warm:images.clinical,0,0,PHOTO_WIDTH,PHOTO_HEIGHT);
  if(state.smell){contactShadow(ctx,227,829,92,.52,.19);ctx.drawImage(images.objects,0,211,585,733,0,252,525,585);}
  if(state.sound){contactShadow(ctx,459,1335,136,.25,.24);ctx.drawImage(images.objects,280,1145,375,240,280,1145,375,240);}
  if(state.taste){contactShadow(ctx,806,188,44,.4,.15);ctx.drawImage(images.objects,743,30,108,177,759,45,89,158);}
  if(!state.sight)coldLighting(ctx);
  if(!state.smell){ctx.fillStyle='rgba(157,157,150,.025)';ctx.fillRect(0,0,PHOTO_WIDTH,PHOTO_HEIGHT);}
  canvas.className='tdb-senses-photo-image';canvas.setAttribute('aria-hidden','true');
  return canvas;
}

function shadowMarkup(warm){
  const id=`tdb-senses-shadow-${++shadowID}`;
  // Cast through the window onto cabinetry and floor, independently of the indoor plant.
  const leaves=[[420,349,35,11,-28],[467,374,32,10,23],[493,414,38,12,-31],[453,449,35,11,17],[527,468,30,10,-25],[545,511,39,12,28],[518,550,33,11,-34],[565,594,42,12,24],[376,675,40,13,-26],[307,721,46,14,30],[337,769,42,12,-27],[225,815,50,13,22],[279,866,45,12,-20],[151,955,53,13,25],[231,1015,47,12,-19]];
  return `<svg viewBox="0 0 1086 1448" aria-hidden="true"><defs><filter id="${id}-soft" x="-30%" y="-20%" width="160%" height="140%"><feGaussianBlur stdDeviation="${warm?6:.7}"/></filter><clipPath id="${id}-surfaces"><path d="M374 245 1015 290 1020 305 704 314 704 469 593 487 470 622 424 707 376 689Z M0 666 379 581 423 862 290 1100 103 1398 0 1431Z"/></clipPath></defs><g clip-path="url(#${id}-surfaces)"><g fill="#11180f" filter="url(#${id}-soft)"><path d="M395 286Q474 398 540 612L536 615Q465 397 391 290Z M405 643Q308 784 137 1090L131 1085Q300 786 397 640Z"/>${leaves.map(([cx,cy,rx,ry,a])=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${cx} ${cy})"/>`).join('')}</g></g></svg>`;
}

export class SceneRenderer{
  constructor(stage,images,report){
    this.stage=stage;this.images=images;this.report=report;this.cache=new Map();this.current=null;this.active=null;this.builds=0;this.disposed=false;
    stage.dataset.renderer='prepared-scenes';stage.dataset.maskDriver='radius-only-raf';
    this.resize();
  }
  scene(state){
    const key=['sight','sound','smell','touch','taste'].map(k=>Number(state[k])).join('');
    if(this.cache.has(key)){const scene=this.cache.get(key);this.cache.delete(key);this.cache.set(key,scene);return scene;}
    const started=performance.now(),node=document.createElement('div');node.className='tdb-senses-scene';node.dataset.state=key;node.dataset.sight=state.sight?'warm':'cold';
    const photo=document.createElement('div');photo.className='tdb-senses-photo';photo.append(makeSurface(this.images,state));
    const shadows=document.createElement('div');shadows.className=`tdb-senses-leaf-shadows ${state.sight?'is-warm':'is-cold'}`;shadows.innerHTML=shadowMarkup(state.sight);photo.append(shadows);
    if(state.smell){const motes=document.createElement('div');motes.className='tdb-senses-motes';motes.innerHTML=[0,1,2,3,4,5,6].map(i=>`<i style="left:${6+i*7.1}%;top:${28+(i*11)%49}%;animation-delay:${-i*2.8}s"></i>`).join('');photo.append(motes);}
    node.append(photo);const scene={node,photo,state:{...state}};this.cache.set(key,scene);this.builds++;
    this.position(scene);this.report({builds:this.builds,buildMs:Math.round(performance.now()-started)});
    this.prune();return scene;
  }
  prune(){
    while(this.cache.size>4){
      const candidate=[...this.cache].find(([,scene])=>scene!==this.current&&scene!==this.active?.next&&!scene.node.isConnected);
      if(!candidate)break;const [key,scene]=candidate;scene.node.querySelector('canvas').width=1;this.cache.delete(key);
    }
  }
  position(scene){
    const r=this.photo;
    Object.assign(scene.photo.style,{width:`${r.width}px`,height:`${r.height}px`,left:`${r.x}px`,top:`${r.y}px`});
  }
  resize(){
    const rect=this.stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
    if(this.width===rect.width&&this.height===rect.height)return;
    this.width=rect.width;this.height=rect.height;this.photo=coverGeometry(rect.width,rect.height);
    this.cache.forEach(scene=>this.position(scene));
    this.stage.dataset.photoRect=JSON.stringify(this.photo);
    // Resizing cannot leave a partially revealed photograph on screen.
    this.active?.finish(true);
  }
  render(state){
    this.active?.finish(false);
    const next=this.scene(state);this.stage.replaceChildren(next.node);this.current=next;
    next.node.classList.remove('tdb-senses-revealing');next.node.style.removeProperty('opacity');this.prune();
  }
  reveal(state,origin,{duration,reduced,onProgress}){
    this.active?.finish(false);
    const next=this.scene(state);
    if(next===this.current)return Promise.resolve(true);
    const node=next.node,feather=20,endRadius=revealRadius(this.width,this.height,origin,feather);
    node.classList.add('tdb-senses-revealing');
    node.style.setProperty('--tdb-senses-origin-x',`${origin.x}px`);node.style.setProperty('--tdb-senses-origin-y',`${origin.y}px`);
    node.style.setProperty('--tdb-senses-feather',`${feather}px`);node.style.setProperty('--tdb-senses-reveal-radius','-12px');
    this.stage.dataset.radiusEnd=String(endRadius);this.stage.dataset.origin=JSON.stringify(origin);
    if(reduced){node.classList.remove('tdb-senses-revealing');node.style.opacity='0';}
    this.stage.append(node);
    return new Promise(resolve=>{
      const active={next,animation:null,frame:0,timers:[],done:false,finish:complete=>{
        if(active.done)return;active.done=true;active.timers.forEach(clearTimeout);cancelAnimationFrame(active.frame);
        // Remove the mask explicitly before cancelling its animation. The old scene
        // is then removed, so no gradient/animation rounding can retain half a state.
        node.classList.remove('tdb-senses-revealing');node.style.removeProperty('opacity');active.animation?.cancel();
        if(complete&&!this.disposed){this.stage.replaceChildren(node);this.current=next;onProgress?.(1);}
        else if(next!==this.current)node.remove();
        if(this.active===active)this.active=null;this.prune();resolve(complete);
      }};
      this.active=active;
      if(reduced){
        active.animation=node.animate([{opacity:0},{opacity:1}],{duration,easing:'linear',fill:'both'});
        active.animation.finished.then(()=>active.finish(true),()=>{});
      }else{
        const start=performance.now();const tick=now=>{
          if(active.done||this.disposed)return;const p=Math.min(1,(now-start)/duration);
          node.style.setProperty('--tdb-senses-reveal-radius',`${(-12+p*(endRadius+12)).toFixed(2)}px`);
          if(p===1)active.finish(true);else active.frame=requestAnimationFrame(tick);
        };active.frame=requestAnimationFrame(tick);
      }
      for(const p of [.25,.5,.75])active.timers.push(setTimeout(()=>{if(!active.done)onProgress?.(p);},duration*p));
      active.timers.push(setTimeout(()=>active.finish(true),duration+80));
    });
  }
  motion(paused){this.stage.classList.toggle('tdb-senses-motion-paused',paused);}
  finish(){this.active?.finish(true);}
  destroy(){
    this.disposed=true;this.active?.finish(false);this.stage.replaceChildren();
    this.cache.forEach(scene=>{const canvas=scene.node.querySelector('canvas');canvas.width=1;canvas.height=1;});
    this.cache.clear();this.current=null;this.images=null;
  }
}

/* TDB Five Senses v0.2.0 — Surgery photographic proof of concept.
 * One registered scene, real old/new photographic circular masking.
 * No IX2, Swiper, analytics, persistence, or document-wide discovery loops.
 */
const IMAGE_SIZE = [1086, 1448];
const DURATION = 3200;
const SENSES = ['sight', 'sound', 'smell', 'touch', 'taste'];
const LABELS = ['Sight', 'Sound', 'Smell', 'Touch', 'Taste'];
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
  request(state, origin, intro = false) {
    const request = { state: { ...state }, origin, intro: intro || !!(this.pending?.intro && state.sound) };
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

export class Soundscape {
  constructor(base, signal, report) {
    this.base = base; this.signal = signal; this.report = report;
    this.context = null; this.sources = []; this.gains = []; this.generation = 0;
    this.ready = false; this.requested = null; this.bytes = null;
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
    if (intro) {
      clinical.setValueAtTime(0, t);
      clinical.linearRampToValueAtTime(.55, t + .15);
      clinical.linearRampToValueAtTime(0, t + 1.18);
      calm.setValueAtTime(0, t); calm.setValueAtTime(0, t + 1.48);
      calm.linearRampToValueAtTime(.85, t + 3.1);
    } else {
      clinical.linearRampToValueAtTime(on ? 0 : .65, t + 1.8);
      calm.linearRampToValueAtTime(on ? .85 : 0, t + 2.6);
    }
  }
  stop() {
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
  let disposed=false,renderer=null,audio=null,audioReady=false,audioPending=false,motionPaused=false,hasBegun=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const initial={sight:true,sound:false,smell:true,touch:true,taste:true};
  const requested={...initial},queue=new TransitionQueue(initial),scope=new AbortController();
  const listen=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:scope.signal});
  const loaded=await Promise.allSettled(['surgery-warm.webp','surgery-clinical.webp','surgery-objects.webp'].map(name=>imageAsset(assetURL(name,assetBase),signal)));
  if(signal.aborted||loaded.some(r=>r.status==='rejected')){
    loaded.forEach(r=>{if(r.status==='fulfilled')r.value.close?.();});
    throw new Error(signal.aborted?'Closed':'The photograph could not load. Please try again.');
  }
  const images={warm:loaded[0].value,clinical:loaded[1].value,objects:loaded[2].value};
  dialog.classList.add('tdb-senses');dialog.dataset.audioState='uninitiated';dialog.dataset.scene='surgery';dialog.dataset.phase='ready';dialog.dataset.version='0.2.0';
  dialog.innerHTML=`<div class="tdb-senses-stage" aria-hidden="true"></div><div class="tdb-senses-shade" aria-hidden="true"></div>
    <header class="tdb-senses-top"><div class="tdb-senses-room">Surgery<span aria-hidden="true"></span></div><div class="tdb-senses-utilities">
    <button type="button" class="tdb-senses-motion" aria-label="Pause ambient motion" aria-pressed="false">${svg('<path d="M12 9v14M20 9v14"/>')}</button>
    <button type="button" class="tdb-senses-close" aria-label="Close experience">${svg('<path d="m9 9 14 14M23 9 9 23"/>')}</button></div></header>
    <h2 id="tdb-senses-title" class="tdb-senses-title">Every sense,<br>considered.</h2>
    <p id="tdb-senses-description" class="tdb-senses-sr">Explore the Surgery. Each control switches one considered detail on or off. Sound starts only when you activate Begin. Sound off plays the conventional soundscape. Close stops all audio. Escape closes the experience.</p>
    <div class="tdb-senses-controls" role="group" aria-label="Five senses">${SENSES.map((sense,i)=>`<button type="button" class="tdb-senses-control" data-sense="${sense}" aria-label="${sense==='sound'?'Begin sound experience':LABELS[i]}" aria-pressed="${initial[sense]}">${sense==='sound'?'<span class="tdb-senses-begin">BEGIN<i aria-hidden="true"></i></span>':''}<span class="tdb-senses-circle">${svg(ICONS[i])}</span><span class="tdb-senses-name">${LABELS[i]}</span><span class="tdb-senses-value">${sense==='sound'?'':initial[sense]?'ON':'OFF'}</span></button>`).join('')}</div>
    <p class="tdb-senses-message" aria-live="polite"></p><p class="tdb-senses-sr tdb-senses-announcement" aria-live="polite"></p>`;
  dialog.setAttribute('aria-labelledby','tdb-senses-title');dialog.setAttribute('aria-describedby','tdb-senses-description');
  const controls=Array.from(dialog.querySelectorAll('[data-sense]'));
  const announcement=dialog.querySelector('.tdb-senses-announcement'),message=dialog.querySelector('.tdb-senses-message'),motion=dialog.querySelector('.tdb-senses-motion');
  const stage=dialog.querySelector('.tdb-senses-stage');
  renderer=new SceneRenderer(stage,images,stats=>{dialog.dataset.sceneBuilds=String(stats.builds);dialog.dataset.lastBuildMs=String(stats.buildMs);});
  renderer.render(initial);
  const createAudio=()=>new Soundscape(assetBase,signal,state=>{dialog.dataset.audioState=state;});
  audio=createAudio();audio.prefetch().catch(()=>{});

  function updateControls(){
    controls.forEach((button,i)=>{
      const sense=SENSES[i],value=!!requested[sense];button.setAttribute('aria-pressed',String(value));
      button.dataset.state=sense==='sound'&&!audioReady?'pending':value?'on':'off';
      button.querySelector('.tdb-senses-value').textContent=sense==='sound'&&!audioReady?'':value?'ON':'OFF';
      if(sense==='sound'){button.setAttribute('aria-label',audioReady?'Sound':'Begin sound experience');button.setAttribute('aria-busy',String(audioPending));}
    });
    dialog.classList.toggle('tdb-senses-awaiting-sound',!audioReady);dialog.classList.toggle('tdb-senses-has-begun',hasBegun);
    motion.hidden=reduced.matches;motion.setAttribute('aria-pressed',String(motionPaused));motion.setAttribute('aria-label',motionPaused?'Resume ambient motion':'Pause ambient motion');
    motion.innerHTML=svg(motionPaused?'<path d="m12 8 13 8-13 8V8Z"/>':'<path d="M12 9v14M20 9v14"/>');
    renderer.motion(motionPaused||reduced.matches||document.hidden);
  }
  function begin(active){
    if(!active||disposed)return;
    const duration=reduced.matches?180:DURATION;
    dialog.dataset.phase='transition';dialog.dataset.transitionProgress='0';dialog.dataset.transitionStarted=String(Math.round(performance.now()));
    if(audioReady&&(active.intro||active.from.sound!==active.state.sound))audio.transition(active.state.sound,active.intro);
    const started=performance.now();
    renderer.reveal(active.state,active.origin,{duration,reduced:reduced.matches,onProgress:p=>{dialog.dataset.transitionProgress=String(p);}}).then(complete=>{
      if(!complete||disposed||signal.aborted||queue.active!==active)return;
      dialog.dataset.lastTransitionMs=String(Math.round(performance.now()-started));
      const pending=queue.finish();dialog.dataset.phase='ready';dialog.dataset.transitionProgress='1';
      dialog.dataset.visibleState=JSON.stringify(queue.visible);
      if(pending)begin(pending);
    });
  }
  function activate(sense,button,intro=false){
    const rect=button.querySelector('.tdb-senses-circle').getBoundingClientRect(),bounds=stage.getBoundingClientRect();
    const origin={x:rect.left+rect.width/2-bounds.left,y:rect.top+rect.height/2-bounds.top};
    hasBegun=true;updateControls();begin(queue.request(requested,origin,intro));
    announcement.textContent=`${LABELS[SENSES.indexOf(sense)]} ${requested[sense]?'on':'off'}.`;
  }
  controls.forEach((button,i)=>listen(button,'click',async()=>{
    const sense=SENSES[i];message.textContent='';
    if(sense==='sound'&&!audioReady){
      if(audioPending)return;audioPending=true;updateControls();const attempt=audio;
      try{
        await attempt.unlock();if(disposed||signal.aborted||audio!==attempt)return;
        audioReady=true;requested.sound=true;activate('sound',button,true);
      }catch(error){
        if(disposed||signal.aborted||audio!==attempt)return;
        audio.stop();audio=createAudio();audioPending=false;message.textContent='Sound could not start. Tap BEGIN to try again.';dialog.dataset.audioState='uninitiated';
      }finally{if(audio===attempt)audioPending=false;if(!disposed)updateControls();}
      return;
    }
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
      audio.stop();audio=createAudio();audioReady=false;audioPending=false;requested.sound=false;
      queue.cancel();queue.visible={...requested};renderer.render(requested);dialog.dataset.audioState='uninitiated';dialog.dataset.phase='ready';dialog.dataset.transitionProgress='1';
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
  dialog.classList.add('tdb-senses-ready');controls[1].focus({preventScroll:true});return{cleanup};
}
