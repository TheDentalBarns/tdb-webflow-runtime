/* Prepared photographic scenes. Only the reveal mask and shadow transforms animate. */
const PHOTO_WIDTH=1086,PHOTO_HEIGHT=1448;

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
  ctx.save();ctx.globalCompositeOperation='copy';ctx.filter='saturate(.79) contrast(1.085) brightness(1.105)';
  ctx.drawImage(ctx.canvas,0,0);ctx.restore();
  ctx.save();ctx.globalCompositeOperation='color';ctx.fillStyle='rgba(134,169,208,.23)';ctx.fillRect(0,0,PHOTO_WIDTH,PHOTO_HEIGHT);ctx.restore();

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
  // The second strip sits above the sink on the actual rear upstand edge.
  // Both fittings stay registered with the photograph when the viewport crops.
  ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='butt';
  for(const [width,blur,colour] of [[18,30,'rgba(165,208,249,.40)'],[6,11,'rgba(211,237,255,.86)'],[2.5,2,'rgba(249,254,255,1)']]){
    ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.shadowBlur=blur;ctx.shadowColor=colour;
    ctx.beginPath();ctx.moveTo(508,31);ctx.lineTo(1086,50);ctx.stroke();
  }
  const glare=ctx.createRadialGradient(700,105,4,700,105,215);
  glare.addColorStop(0,'rgba(215,235,255,.23)');glare.addColorStop(1,'rgba(215,235,255,0)');
  ctx.fillStyle=glare;ctx.fillRect(475,30,450,235);ctx.restore();
}

// Upholstery and its geometry are separate concerns. Recolour only the registered
// upholstery pixels once during scene preparation; retain all texture and highlights.
function chairColour(ctx,state){
  if(state.sight===state.touch)return;
  const canvas=ctx.canvas,pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  let mask=null;
  if(state.touch){
    const region=document.createElement('canvas');region.width=PHOTO_WIDTH;region.height=PHOTO_HEIGHT;
    const m=region.getContext('2d');m.fillStyle='#fff';
    const paths=[
      'M719 367Q744 304 815 314L919 321Q969 333 966 403Q964 460 925 483Q837 505 768 475Q706 449 719 367Z',
      'M428 787Q454 681 544 571Q631 463 695 483Q819 544 930 516Q1005 500 1044 566L1086 727V922Q1022 1010 873 1051Q719 1089 581 1010Q418 929 428 787Z',
      'M91 1448Q166 1304 307 1164Q411 1070 500 1047Q530 1041 565 1059L897 1135L891 1216Q876 1279 955 1305Q1007 1310 985 1390L965 1448Z'
    ];paths.forEach(path=>m.fill(new Path2D(path)));mask=m.getImageData(0,0,PHOTO_WIDTH,PHOTO_HEIGHT).data;
    region.width=1;region.height=1;
  }
  for(let y=298;y<PHOTO_HEIGHT;y++)for(let x=84;x<PHOTO_WIDTH;x++){
    const i=(y*PHOTO_WIDTH+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    const amount=state.touch?mask[i+3]/255:Math.min(1,Math.max(0,(b-r-8)/17))*Math.min(1,Math.max(0,(b-g-3)/9));
    if(!amount)continue;
    const light=.2126*r+.7152*g+.0722*b;
    // Mica follows the bronze/taupe highlights in the supplied real photograph.
    const high=Math.min(1,Math.max(0,(light-105)/100));
    const target=state.sight?[light*(1.16-high*.08),light*(.96+high*.03),light*(.70+high*.16)]:[light*.66,light*.91,light*1.28];
    for(let c=0;c<3;c++)data[i+c]=data[i+c]*(1-amount)+target[c]*amount;
  }
  ctx.putImageData(pixels,0,0);
}

function chairGlare(touch){
  const canvas=document.createElement('canvas');canvas.width=543;canvas.height=724;
  const ctx=canvas.getContext('2d');ctx.scale(.5,.5);
  function reflection(x,y,rx,ry,angle,alpha){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(rx,ry);
    const g=ctx.createRadialGradient(0,0,.08,0,0,1);
    g.addColorStop(0,`rgba(233,245,255,${alpha})`);g.addColorStop(.32,`rgba(211,235,255,${alpha*.45})`);g.addColorStop(1,'rgba(211,235,255,0)');
    ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  reflection(876,406,32,62,.32,.40);
  reflection(touch?854:940,touch?859:794,38,151,.29,.31);
  reflection(621,1198,122,17,.19,.22);
  canvas.className='tdb-senses-chair-glare';canvas.setAttribute('aria-hidden','true');return canvas;
}

function makeSurface(images,state){
  const canvas=document.createElement('canvas');canvas.width=PHOTO_WIDTH;canvas.height=PHOTO_HEIGHT;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.drawImage(state.touch?images.warm:images.clinical,0,0,PHOTO_WIDTH,PHOTO_HEIGHT);
  chairColour(ctx,state);
  if(state.smell){contactShadow(ctx,227,829,92,.52,.19);ctx.drawImage(images.objects,0,211,585,733,0,252,525,585);}
  if(state.sound){contactShadow(ctx,459,1335,136,.25,.24);ctx.drawImage(images.objects,280,1145,375,240,280,1145,375,240);}
  if(state.taste){contactShadow(ctx,806,188,44,.4,.15);ctx.drawImage(images.objects,743,30,108,177,759,45,89,158);}
  if(!state.sight)coldLighting(ctx);
  if(!state.smell){ctx.fillStyle='rgba(157,157,150,.025)';ctx.fillRect(0,0,PHOTO_WIDTH,PHOTO_HEIGHT);}
  canvas.className='tdb-senses-photo-image';canvas.setAttribute('aria-hidden','true');
  return canvas;
}

function leafShadows(images,warm){
  // Reuse photographic foliage alpha at half resolution instead of synthetic leaves
  // or a live SVG blur. Only this prepared layer's transform moves in the browser.
  const canvas=document.createElement('canvas');canvas.width=543;canvas.height=724;
  const ctx=canvas.getContext('2d');ctx.scale(.5,.5);
  ctx.beginPath();
  ctx.moveTo(374,245);ctx.lineTo(704,270);ctx.lineTo(704,480);ctx.lineTo(594,493);ctx.lineTo(471,622);ctx.lineTo(424,707);ctx.lineTo(376,689);ctx.closePath();
  ctx.moveTo(0,666);ctx.lineTo(379,581);ctx.lineTo(423,862);ctx.lineTo(290,1100);ctx.lineTo(103,1398);ctx.lineTo(0,1431);ctx.closePath();ctx.clip();
  ctx.filter=`blur(${warm?7:1.1}px)`;
  ctx.save();ctx.transform(.76,.2,-.30,.59,331,275);ctx.drawImage(images.objects,0,211,585,540,0,0,585,540);ctx.restore();
  ctx.save();ctx.transform(.73,-.36,.08,.92,-140,829);ctx.drawImage(images.objects,0,211,585,540,0,0,585,540);ctx.restore();
  ctx.filter='none';ctx.globalCompositeOperation='source-in';ctx.fillStyle='#11180f';ctx.fillRect(0,0,PHOTO_WIDTH,PHOTO_HEIGHT);
  canvas.className=`tdb-senses-leaf-shadows ${warm?'is-warm':'is-cold'}`;canvas.setAttribute('aria-hidden','true');return canvas;
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
    photo.append(leafShadows(this.images,state.sight));
    if(!state.sight)photo.append(chairGlare(state.touch));
    if(state.smell){const motes=document.createElement('div');motes.className='tdb-senses-motes';motes.innerHTML=[0,1,2,3,4,5,6].map(i=>`<i style="left:${6+i*7.1}%;top:${28+(i*11)%49}%;animation-delay:${-i*2.8}s"></i>`).join('');photo.append(motes);}
    node.append(photo);const scene={node,photo,state:{...state}};this.cache.set(key,scene);this.builds++;
    this.position(scene);this.report({builds:this.builds,buildMs:Math.round(performance.now()-started)});
    this.prune();return scene;
  }
  prune(){
    while(this.cache.size>4){
      const candidate=[...this.cache].find(([,scene])=>scene!==this.current&&scene!==this.active?.next&&!scene.node.isConnected);
      if(!candidate)break;const [key,scene]=candidate;scene.node.querySelectorAll('canvas').forEach(canvas=>{canvas.width=1;canvas.height=1;});this.cache.delete(key);
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
  reveal(state,origin,{duration,reverse=false,reduced,onProgress}){
    this.active?.finish(false);
    const next=this.scene(state),previous=this.current;
    if(next===previous)return Promise.resolve(true);
    // ON: the new scene grows over the old. OFF: the current scene contracts
    // over the full new scene beneath it, all the way back into the control.
    const contracting=reverse&&!reduced&&!!previous;
    const maskNode=contracting?previous.node:next.node,feather=20,endRadius=revealRadius(this.width,this.height,origin,feather);
    maskNode.classList.add('tdb-senses-revealing');
    maskNode.style.setProperty('--tdb-senses-origin-x',`${origin.x}px`);maskNode.style.setProperty('--tdb-senses-origin-y',`${origin.y}px`);
    maskNode.style.setProperty('--tdb-senses-feather',`${feather}px`);maskNode.style.setProperty('--tdb-senses-reveal-radius',`${contracting?endRadius:-12}px`);
    this.stage.dataset.radiusEnd=String(endRadius);this.stage.dataset.origin=JSON.stringify(origin);this.stage.dataset.direction=contracting?'contract':'expand';
    if(reduced){maskNode.classList.remove('tdb-senses-revealing');maskNode.style.opacity='0';}
    if(contracting)this.stage.replaceChildren(next.node,maskNode);else this.stage.append(next.node);
    return new Promise(resolve=>{
      const active={next,animation:null,frame:0,timers:[],done:false,finish:complete=>{
        if(active.done)return;active.done=true;active.timers.forEach(clearTimeout);cancelAnimationFrame(active.frame);
        // Settle to exactly one unmasked photograph at either endpoint, including
        // cancellation/resize paths; no half mask can survive animation rounding.
        maskNode.classList.remove('tdb-senses-revealing');maskNode.style.removeProperty('opacity');active.animation?.cancel();
        if(complete&&!this.disposed){this.stage.replaceChildren(next.node);this.current=next;onProgress?.(1);}
        else if(previous&&!this.disposed)this.stage.replaceChildren(previous.node);
        else next.node.remove();
        if(this.active===active)this.active=null;this.prune();resolve(complete);
      }};
      this.active=active;
      if(reduced){
        active.animation=next.node.animate([{opacity:0},{opacity:1}],{duration,easing:'linear',fill:'both'});
        active.animation.finished.then(()=>active.finish(true),()=>{});
      }else{
        const start=performance.now();const tick=now=>{
          if(active.done||this.disposed)return;const p=Math.min(1,(now-start)/duration);
          const radius=contracting?endRadius-p*(endRadius+12):-12+p*(endRadius+12);
          maskNode.style.setProperty('--tdb-senses-reveal-radius',`${radius.toFixed(2)}px`);
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
    this.cache.forEach(scene=>scene.node.querySelectorAll('canvas').forEach(canvas=>{canvas.width=1;canvas.height=1;}));
    this.cache.clear();this.current=null;this.images=null;
  }
}
