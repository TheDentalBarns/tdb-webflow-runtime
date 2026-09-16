/* TDB Five Senses v0.1.0 — Surgery photographic proof of concept.
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

function compose(images, state) {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = IMAGE_SIZE;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.drawImage(state.touch ? images.warm : images.clinical, 0, 0, ...IMAGE_SIZE);
  const overlay = images.objects;
  if (state.smell) {
    // Separate contact shadow works over both parquet and lino.
    ctx.save(); ctx.translate(243, 817); ctx.scale(1, .17);
    const shadow = ctx.createRadialGradient(0,0,5,0,0,82);
    shadow.addColorStop(0,'rgba(15,12,6,.22)'); shadow.addColorStop(1,'rgba(15,12,6,0)');
    ctx.fillStyle = shadow; ctx.fillRect(-82,-82,164,164); ctx.restore();
    ctx.drawImage(overlay, 0, 211, 585, 733, 0, 252, 525, 585);
  }
  if (state.sound) {
    ctx.save(); ctx.translate(459, 1335); ctx.scale(1,.24);
    const shadow = ctx.createRadialGradient(0,0,8,0,0,136);
    shadow.addColorStop(0,'rgba(9,8,6,.25)'); shadow.addColorStop(1,'rgba(9,8,6,0)');
    ctx.fillStyle=shadow; ctx.fillRect(-136,-136,272,272); ctx.restore();
    ctx.drawImage(overlay, 280, 1145, 375, 240, 280, 1145, 375, 240);
  }
  if (state.taste) ctx.drawImage(overlay, 743, 30, 108, 177, 759, 39, 89, 158);
  return canvas;
}

const VERTEX = `attribute vec2 position; varying vec2 vUV;
void main(){vUV=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const FRAGMENT = `precision mediump float;
varying vec2 vUV;
uniform sampler2D oldImage; uniform sampler2D newImage;
uniform vec2 viewport; uniform vec4 photoRect; uniform vec2 origin;
uniform float radius; uniform float feather; uniform float mixAll; uniform float clock;
uniform vec2 oldSenses; uniform vec2 newSenses;
float oval(vec2 p, vec2 centre, vec2 size){vec2 d=(p-centre)/size;return exp(-dot(d,d)*2.);}
vec3 scene(sampler2D picture, vec2 senses, vec2 p){
  vec2 uv=(p-photoRect.xy)/photoRect.zw;
  vec3 matte=mix(vec3(.064,.071,.076),vec3(.074,.071,.064),senses.x);
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return matte;
  vec3 colour=texture2D(picture,uv).rgb;
  if(senses.x<.5){
    float light=dot(colour,vec3(.2126,.7152,.0722));
    colour=mix(colour,vec3(light),.11)*vec3(.89,.99,1.12);
    colour=(colour-.5)*1.07+.5;
    float glare=oval(uv,vec2(.1,.14),vec2(.14,.55));
    colour+=glare*vec3(.012,.021,.032);
  } else if(senses.y>.5){
    float drift=sin(clock*.23)*.011;
    float shade=oval(uv,vec2(.16+drift,.67),vec2(.075,.022));
    shade+=oval(uv,vec2(.26-drift*.7,.73),vec2(.07,.028));
    shade+=oval(uv,vec2(.13+drift,.78),vec2(.09,.025));
    colour*=1.-shade*.033;
  }
  if(senses.y<.5){
    float veil=.023+.004*sin(uv.y*12.+uv.x*8.+clock*.13);
    colour=mix(colour,vec3(.61,.61,.59),veil);
  }else{
    for(int i=0;i<7;i++){
      float f=float(i);
      vec2 q=vec2(.04+fract(f*.173+sin(clock*.08+f)*.016)*.52,
        .24+fract(f*.231-clock*.007)*.55);
      float petal=oval(uv,q,vec2(.0028,.0015));
      colour=mix(colour,vec3(.91,.87,.75),petal*.12);
    }
  }
  return clamp(colour,0.,1.);
}
void main(){
  vec2 p=vec2(vUV.x,1.-vUV.y)*viewport;
  vec3 before=scene(oldImage,oldSenses,p);
  vec3 after=scene(newImage,newSenses,p);
  float mask=mixAll>=0.?mixAll:1.-smoothstep(radius-feather*.5,radius+feather*.5,distance(p,origin));
  gl_FragColor=vec4(mix(before,after,mask),1.);
}`;

class Renderer {
  constructor(canvas,forceCanvas=false) {
    this.canvas=canvas; this.width=0; this.height=0; this.old=null; this.next=null;
    this.gl=forceCanvas?null:canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
    if (this.gl) {
      try { this.setupGL(); this.canvas.dataset.renderer='webgl'; }
      catch (e) {
        this.dispose();
        const replacement=canvas.cloneNode(); canvas.replaceWith(replacement); this.canvas=replacement;
        this.gl=null;
      }
    }
    if(!this.gl){this.ctx=this.canvas.getContext('2d',{alpha:false});this.canvas.dataset.renderer='canvas';}
  }
  setupGL() {
    const gl=this.gl;
    const shader=(type,source)=>{
      const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const vs=shader(gl.VERTEX_SHADER,VERTEX),fs=shader(gl.FRAGMENT_SHADER,FRAGMENT);
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Renderer unavailable');
    gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);this.program=program;
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    this.uniforms={};
    for(const name of ['viewport','photoRect','origin','radius','feather','mixAll','clock','oldSenses','newSenses'])this.uniforms[name]=gl.getUniformLocation(program,name);
    this.textures=[0,1].map((i)=>{
      const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(program,i?'newImage':'oldImage'),i);return tex;
    });
  }
  resize() {
    const rect=this.canvas.getBoundingClientRect();
    this.width=rect.width;this.height=rect.height;
    // Bound the back buffer independently of a phone's physical DPR.
    this.dpr=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(2200000/(rect.width*rect.height)));
    this.canvas.width=Math.max(1,Math.round(rect.width*this.dpr));this.canvas.height=Math.max(1,Math.round(rect.height*this.dpr));
    const scale=Math.min(rect.width/IMAGE_SIZE[0],rect.height/IMAGE_SIZE[1]);
    this.photo=[(rect.width-IMAGE_SIZE[0]*scale)/2,(rect.height-IMAGE_SIZE[1]*scale)/2,IMAGE_SIZE[0]*scale,IMAGE_SIZE[1]*scale];
    if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
  }
  images(old,next) {
    this.old=old;this.next=next;
    if(!this.gl)return;
    const gl=this.gl;
    [old,next].forEach((image,i)=>{
      gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    });
  }
  frame({from,to,origin,radius,feather,mixAll,time}) {
    if(!this.old||!this.width)return;
    if(this.gl){
      const gl=this.gl,u=this.uniforms;
      gl.uniform2f(u.viewport,this.width,this.height);gl.uniform4fv(u.photoRect,this.photo);
      gl.uniform2f(u.origin,origin.x,origin.y);gl.uniform1f(u.radius,radius);gl.uniform1f(u.feather,feather);
      gl.uniform1f(u.mixAll,mixAll);gl.uniform1f(u.clock,time);
      gl.uniform2f(u.oldSenses,Number(from.sight),Number(from.smell));gl.uniform2f(u.newSenses,Number(to.sight),Number(to.smell));
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }else{
      const ctx=this.ctx,[x,y,w,h]=this.photo;
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      const draw=(image,state)=>{ctx.fillStyle=state.sight?'#131210':'#101214';ctx.fillRect(0,0,this.width,this.height);ctx.filter=state.sight?'none':'saturate(.8) contrast(1.07)';ctx.drawImage(image,x,y,w,h);ctx.filter='none';};
      draw(this.old,from);ctx.save();
      if(mixAll>=0)ctx.globalAlpha=mixAll;
      else{ctx.beginPath();ctx.arc(origin.x,origin.y,Math.max(0,radius),0,Math.PI*2);ctx.clip();}
      draw(this.next,to);ctx.restore();
    }
  }
  dispose(){
    if(this.gl){
      this.textures?.forEach(t=>this.gl.deleteTexture(t));
      if(this.buffer)this.gl.deleteBuffer(this.buffer);if(this.program)this.gl.deleteProgram(this.program);
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.old=null;this.next=null;
  }
}

export async function mountExperience({dialog,signal,assetBase,onClose,forceCanvas=false}) {
  let disposed=false,frameID=0,timerID=0,images=null,renderer=null,audio=null;
  let audioReady=false,audioPending=false,motionPaused=false,hasBegun=false;
  let ambientTime=0,lastFrameTime=0,drawCount=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const initial={sight:true,sound:false,smell:true,touch:true,taste:true};
  const requested={...initial};const queue=new TransitionQueue(initial);
  const scope=new AbortController();
  const listen=(el,event,fn,options={})=>el.addEventListener(event,fn,{...options,signal:scope.signal});
  const readyImages=await Promise.allSettled([
    imageAsset(assetURL('surgery-warm.webp',assetBase),signal),
    imageAsset(assetURL('surgery-clinical.webp',assetBase),signal),
    imageAsset(assetURL('surgery-objects.webp',assetBase),signal)
  ]);
  if(signal.aborted||readyImages.some(r=>r.status==='rejected')){
    readyImages.forEach(r=>{if(r.status==='fulfilled')r.value.close?.();});
    throw new Error(signal.aborted?'Closed':'The photograph could not load. Please try again.');
  }
  images={warm:readyImages[0].value,clinical:readyImages[1].value,objects:readyImages[2].value};
  dialog.classList.add('tdb-senses');
  dialog.dataset.audioState='uninitiated';dialog.dataset.scene='surgery';dialog.dataset.phase='ready';
  dialog.innerHTML=`<div class="tdb-senses-stage"><canvas class="tdb-senses-canvas" aria-hidden="true"></canvas></div>
    <div class="tdb-senses-shade" aria-hidden="true"></div>
    <header class="tdb-senses-top"><div class="tdb-senses-room">Surgery<span aria-hidden="true"></span></div>
    <div class="tdb-senses-utilities"><button type="button" class="tdb-senses-motion" aria-label="Pause ambient motion" aria-pressed="false">${svg('<path d="M12 9v14M20 9v14"/>')}</button>
    <button type="button" class="tdb-senses-close" aria-label="Close experience">${svg('<path d="m9 9 14 14M23 9 9 23"/>')}</button></div></header>
    <h2 id="tdb-senses-title" class="tdb-senses-title">Every sense,<br>considered.</h2>
    <p id="tdb-senses-description" class="tdb-senses-sr">Explore the Surgery. Each control switches one considered detail on or off. Sound starts only when you activate Begin. Sound off plays the conventional soundscape. Close stops all audio. Escape closes the experience.</p>
    <div class="tdb-senses-controls" role="group" aria-label="Five senses">${SENSES.map((sense,i)=>`<button type="button" class="tdb-senses-control" data-sense="${sense}" aria-label="${sense==='sound'?'Begin sound experience':LABELS[i]}" aria-pressed="${initial[sense]}">${sense==='sound'?'<span class="tdb-senses-begin">BEGIN<i aria-hidden="true"></i></span>':''}<span class="tdb-senses-circle">${svg(ICONS[i])}</span><span class="tdb-senses-name">${LABELS[i]}</span><span class="tdb-senses-value">${sense==='sound'?'':initial[sense]?'ON':'OFF'}</span></button>`).join('')}</div>
    <p class="tdb-senses-message" aria-live="polite"></p><p class="tdb-senses-sr tdb-senses-announcement" aria-live="polite"></p>`;
  dialog.setAttribute('aria-labelledby','tdb-senses-title');dialog.setAttribute('aria-describedby','tdb-senses-description');
  const controls=Array.from(dialog.querySelectorAll('[data-sense]'));
  const announcement=dialog.querySelector('.tdb-senses-announcement');
  const message=dialog.querySelector('.tdb-senses-message');
  const motion=dialog.querySelector('.tdb-senses-motion');
  renderer=new Renderer(dialog.querySelector('canvas'),forceCanvas);
  renderer.resize();
  let currentSurface=compose(images,initial),nextSurface=currentSurface;
  renderer.images(currentSurface,nextSurface);
  const createAudio=()=>new Soundscape(assetBase,signal,state=>{dialog.dataset.audioState=state;});
  audio=createAudio();audio.prefetch().catch(()=>{});

  function updateControls(){
    controls.forEach((button,i)=>{
      const sense=SENSES[i],value=!!requested[sense];
      button.setAttribute('aria-pressed',String(value));
      button.dataset.state=sense==='sound'&&!audioReady?'pending':value?'on':'off';
      button.querySelector('.tdb-senses-value').textContent=sense==='sound'&&!audioReady?'':value?'ON':'OFF';
      if(sense==='sound'){
        button.setAttribute('aria-label',audioReady?'Sound':'Begin sound experience');
        button.setAttribute('aria-busy',String(audioPending));
      }
    });
    dialog.classList.toggle('tdb-senses-awaiting-sound',!audioReady);
    dialog.classList.toggle('tdb-senses-has-begun',hasBegun);
    motion.hidden=reduced.matches;
    motion.setAttribute('aria-pressed',String(motionPaused));
    motion.setAttribute('aria-label',motionPaused?'Resume ambient motion':'Pause ambient motion');
    motion.innerHTML=svg(motionPaused?'<path d="m12 8 13 8-13 8V8Z"/>':'<path d="M12 9v14M20 9v14"/>');
  }
  function cancelFrame(){cancelAnimationFrame(frameID);clearTimeout(timerID);frameID=0;timerID=0;}
  function schedule(){
    if(disposed||document.hidden||frameID||timerID)return;
    frameID=requestAnimationFrame(frame);
  }
  function begin(active){
    if(!active)return;
    active.started=performance.now();
    nextSurface=compose(images,active.state);
    renderer.images(currentSurface,nextSurface);
    dialog.dataset.phase='transition';
    if(audioReady&&(active.intro||active.from.sound!==active.state.sound))audio.transition(active.state.sound,active.intro);
    cancelFrame();schedule();
  }
  function frame(now){
    frameID=0;timerID=0;if(disposed||document.hidden)return;
    if(lastFrameTime&&!motionPaused&&!reduced.matches)ambientTime+=Math.min(now-lastFrameTime,100)/1000;
    lastFrameTime=now;
    const active=queue.active;
    const progress=active?Math.min(1,(now-active.started)/(reduced.matches?180:DURATION)):1;
    // Gentle acceleration and settlement, not the abrupt ease-out of a ripple.
    const eased=progress*progress*(3-2*progress);
    const origin=active?.origin||{x:renderer.width/2,y:renderer.height};
    const maxRadius=Math.max(...[[0,0],[renderer.width,0],[0,renderer.height],[renderer.width,renderer.height]].map(([x,y])=>Math.hypot(x-origin.x,y-origin.y)))+32;
    renderer.frame({from:active?.from||queue.visible,to:active?.state||queue.visible,origin,
      radius:-24+eased*(maxRadius+24),feather:Math.max(18,Math.min(renderer.width,renderer.height)*.045),
      mixAll:!active?1:reduced.matches?progress:-1,time:ambientTime});
    drawCount++;dialog.dataset.transitionProgress=progress.toFixed(2);dialog.dataset.frames=String(drawCount);
    if(active&&progress>=1){
      currentSurface=nextSurface;
      const pending=queue.finish();
      renderer.images(currentSurface,currentSurface);
      dialog.dataset.phase='ready';
      if(pending){begin(pending);return;}
    }
    if(queue.active)schedule();
    else if(!motionPaused&&!reduced.matches){timerID=setTimeout(()=>{timerID=0;schedule();},42);}
  }
  function activate(sense,button,intro=false){
    const rect=button.querySelector('.tdb-senses-circle').getBoundingClientRect();
    const bounds=renderer.canvas.getBoundingClientRect();
    const origin={x:rect.left+rect.width/2-bounds.left,y:rect.top+rect.height/2-bounds.top};
    begin(queue.request(requested,origin,intro));
    updateControls();
    announcement.textContent=`${LABELS[SENSES.indexOf(sense)]} ${requested[sense]?'on':'off'}.`;
  }
  controls.forEach((button,i)=>listen(button,'click',async()=>{
    const sense=SENSES[i];message.textContent='';
    if(sense==='sound'&&!audioReady){
      if(audioPending)return;
      audioPending=true;updateControls();
      const attempt=audio;
      try{
        await attempt.unlock();if(disposed||signal.aborted||audio!==attempt)return;
        audioReady=true;hasBegun=true;requested.sound=true;
        activate('sound',button,true);
      }catch(error){
        if(disposed||signal.aborted||audio!==attempt)return;
        audio.stop();audio=createAudio();
        audioPending=false;
        message.textContent='Sound could not start. Tap BEGIN to try again.';
        dialog.dataset.audioState='uninitiated';
      }finally{if(audio===attempt){audioPending=false;if(!disposed)updateControls();}}
      return;
    }
    requested[sense]=!requested[sense];activate(sense,button);
  }));
  listen(dialog.querySelector('.tdb-senses-close'),'click',onClose);
  listen(motion,'click',()=>{motionPaused=!motionPaused;updateControls();cancelFrame();schedule();});
  listen(dialog,'keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!event.target.closest('[data-sense]'))return;
    event.preventDefault();const current=controls.indexOf(event.target.closest('[data-sense]'));
    const next=event.key==='Home'?0:event.key==='End'?4:(current+(event.key==='ArrowRight'?1:4))%5;controls[next].focus();
  });
  const resize=new ResizeObserver(()=>{if(disposed)return;renderer.resize();schedule();});resize.observe(dialog);
  listen(renderer.canvas,'webglcontextlost',event=>{
    event.preventDefault();if(disposed)return;
    const replacement=renderer.canvas.cloneNode();renderer.canvas.replaceWith(replacement);
    renderer=new Renderer(replacement,true);renderer.resize();renderer.images(currentSurface,nextSurface);
    cancelFrame();schedule();
  });
  listen(reduced,'change',()=>{updateControls();cancelFrame();schedule();});
  listen(document,'visibilitychange',()=>{
    cancelFrame();lastFrameTime=0;
    if(document.hidden){
      audio.stop();audio=createAudio();audioReady=false;audioPending=false;requested.sound=false;
      queue.cancel();queue.visible={...requested};
      currentSurface=compose(images,requested);nextSurface=currentSurface;renderer.images(currentSurface,currentSurface);
      dialog.dataset.audioState='uninitiated';dialog.dataset.phase='ready';updateControls();
    }else schedule();
  });
  const cleanup=()=>{
    if(disposed)return;disposed=true;cancelFrame();queue.cancel();audio.stop();scope.abort();resize.disconnect();renderer.dispose();
    Object.values(images).forEach(image=>image.close?.());currentSurface=null;nextSurface=null;images=null;
  };
  signal.addEventListener('abort',cleanup,{once:true});
  updateControls();frame(performance.now());
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(signal.aborted){cleanup();return;}
  dialog.classList.add('tdb-senses-ready');
  controls[1].focus({preventScroll:true});
  return {cleanup};
}
