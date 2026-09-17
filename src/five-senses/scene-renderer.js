/* Prepared photographic scenes. Only the reveal mask and a restrained reflection opacity animate. */
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

  // Cores follow measured edges in the registered plate, not viewport offsets.
  // Keep the emitter narrow; bloom is a low-opacity halo, not a wide painted bar.
  function strip(x1,y1,x2,y2){
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='butt';
    for(const [width,blur,colour] of [[23,38,'rgba(207,229,245,.30)'],[11,23,'rgba(207,229,245,.32)'],[5,9,'rgba(228,243,253,.66)'],[2,2,'rgba(252,254,255,.98)']]){
      ctx.lineWidth=width;ctx.strokeStyle=colour;ctx.shadowBlur=blur;ctx.shadowColor=colour;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    }
    ctx.restore();
  }
  // The front edge drops 55px across the plate. Seat the light in the underside.
  const start={x:382,y:231},end={x:1086,y:286};
  ctx.save();ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x,345);ctx.lineTo(start.x,290);ctx.closePath();ctx.clip();
  const spill=ctx.createLinearGradient(0,234,0,334);spill.addColorStop(0,'rgba(226,240,250,.16)');spill.addColorStop(1,'rgba(226,240,250,0)');
  ctx.globalCompositeOperation='screen';ctx.fillStyle=spill;ctx.fillRect(380,230,706,120);ctx.restore();
  strip(start.x,start.y,end.x,end.y);

  // Trace the lower edge of the rear ledge. The tap handle sits in front of it.
  ctx.save();
  const visible=new Path2D('M0 0H1086V1448H0Z M624 10Q631 8 637 15L633 34Q631 47 621 54L582 79L578 73L610 49Q621 37 623 14Z');
  ctx.clip(visible,'evenodd');strip(503,34,1086,54);ctx.restore();
}

function floorReflections(ctx){
  // Reflected window light on the lino: elongated along the floor plane and
  // modulated by the original grain, with the chair and armrest occluding it.
  const x0=0,y0=570,width=580,height=814;
  const region=document.createElement('canvas');region.width=width;region.height=height;
  const m=region.getContext('2d');m.translate(0,-y0);m.fillStyle='#fff';
  m.fill(new Path2D('M0 707L195 584L246 565L383 591L425 816Q420 894 493 953Q529 989 578 1018L576 1058L507 1047Q419 1080 347 1138Q220 1221 92 1448L0 1448Z'));
  m.globalCompositeOperation='destination-out';
  m.fill(new Path2D('M145 1065Q164 1031 189 1009L317 941Q339 930 363 939L423 973Q455 990 452 1044L426 1038Q407 1030 393 1016L344 1001L211 1101Q183 1118 153 1102Q140 1087 145 1065Z'));
  const mask=m.getImageData(0,0,width,height).data,pixels=ctx.getImageData(x0,y0,width,height),data=pixels.data;
  const smooth=(a,b,v)=>{const p=Math.max(0,Math.min(1,(v-a)/(b-a)));return p*p*(3-2*p);};
  // Row constants and a small Gaussian lookup avoid repeated transcendental
  // calculations over the whole floor during first-scene preparation.
  const gaussian=Float32Array.from({length:257},(_,i)=>Math.exp(-Math.pow(i*3/256,2)));
  for(let y=0;y<height;y++){
    const py=y+y0,c1=214-(py-690)*.016,c2=304-(py-730)*.10;
    const w1=15+(py-690)*.013,w2=11+Math.max(0,py-730)*.012;
    const a1=smooth(650,795,py)*(1-smooth(1200,1384,py))*.30;
    const a2=smooth(715,850,py)*(1-smooth(1070,1290,py))*.21;
    if(a1+a2===0)continue;
    const left=Math.max(0,Math.floor(Math.min(c1-3*w1,c2-3*w2))),right=Math.min(width,Math.ceil(Math.max(c1+3*w1,c2+3*w2)));
    for(let x=left;x<right;x++){
      const i=(y*width+x)*4;if(!mask[i+3])continue;
      const d1=Math.round(Math.abs(x-c1)/w1*256/3),d2=Math.round(Math.abs(x-c2)/w2*256/3);
      const first=d1<=256?gaussian[d1]*a1:0,second=d2<=256?gaussian[d2]*a2:0;
      const light=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
      const grain=.45+.55*Math.max(0,Math.min(1,(light-95)/95));
      const alpha=(first+second)*grain*mask[i+3]/255;
      for(let c=0;c<3;c++)data[i+c]=data[i+c]+(255-data[i+c])*alpha;
    }
  }
  ctx.putImageData(pixels,x0,y0);region.width=1;region.height=1;
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
    // Trace the three upholstered pieces independently of their brightness.
    // The pale highlights are still leather: never punch holes based on luminance.
    const paths=[
      'M714 387C716 359 733 332 760 319C779 310 791 313 813 317C846 321 887 320 921 324C945 328 955 346 960 371C967 403 959 439 942 461C926 482 906 488 878 487L800 479C765 475 739 462 723 443C712 429 710 411 714 387Z',
      'M677 483C654 480 638 489 621 500L596 525L571 550L549 575L528 600L491 650L457 700C440 730 426 764 426 788C425 808 434 828 444 850C455 869 471 886 486 903C511 923 529 940 544 952C565 969 581 981 598 989C666 1018 750 1032 835 1033C903 1032 970 1008 1016 973C1057 940 1077 903 1086 855L1086 634C1070 587 1050 546 1020 528C991 511 955 511 913 522C861 536 814 529 763 512C735 503 698 485 677 483Z',
      'M96 1448L114 1400L143 1350L184 1300L228 1250L276 1200L333 1150L388 1108L423 1080L435 1060Q458 1042 491 1057C521 1067 552 1069 579 1078C661 1098 726 1109 784 1125L879 1142L879 1226C876 1251 879 1273 895 1288L945 1309C970 1328 979 1357 966 1392L948 1448Z'
    ];
    m.filter='blur(.6px)';m.lineWidth=2;m.strokeStyle='#fff';paths.forEach(path=>{const contour=new Path2D(path);m.fill(contour);m.stroke(contour);});
    mask=m.getImageData(0,0,PHOTO_WIDTH,PHOTO_HEIGHT).data;
    region.width=1;region.height=1;
  }
  for(let y=298;y<PHOTO_HEIGHT;y++)for(let x=84;x<PHOTO_WIDTH;x++){
    const i=(y*PHOTO_WIDTH+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    const amount=state.touch?mask[i+3]/255:Math.min(1,Math.max(0,(b-r-8)/17))*Math.min(1,Math.max(0,(b-g-3)/9));
    if(!amount)continue;
    const light=(.2126*r+.7152*g+.0722*b)*(state.touch?1.30:1)+ (state.touch?25:0);
    // Mica follows the bronze/taupe highlights in the supplied real photograph.
    const high=Math.min(1,Math.max(0,(light-105)/100));
    const target=state.sight?[light*(1.16-high*.08),light*(.96+high*.03),light*(.70+high*.16)]:[light*.66,light*.91,light*1.28];
    for(let c=0;c<3;c++)data[i+c]=data[i+c]*(1-amount)+target[c]*amount;
  }
  ctx.putImageData(pixels,0,0);
}

function chairGlare(surface){
  // Derive the glint from the photograph's real upholstery highlights. This
  // preserves the curved reflection, grain and seams instead of painting an orb.
  const x=711,y=296,width=260,height=199;
  const source=surface.getContext('2d').getImageData(x,y,width,height);
  const detail=document.createElement('canvas');detail.width=width;detail.height=height;
  const dc=detail.getContext('2d'),pixels=dc.createImageData(width,height);
  for(let i=0;i<source.data.length;i+=4){
    const r=source.data[i],g=source.data[i+1],b=source.data[i+2];
    const material=Math.max(0,Math.min(1,(b-r-12)/24));
    const light=.2126*r+.7152*g+.0722*b;
    const specular=Math.pow(Math.max(0,Math.min(1,(light-73)/76)),1.65);
    pixels.data[i]=236;pixels.data[i+1]=245;pixels.data[i+2]=251;
    pixels.data[i+3]=255*.48*specular*material;
  }
  dc.putImageData(pixels,0,0);
  const canvas=document.createElement('canvas');canvas.width=543;canvas.height=724;
  const ctx=canvas.getContext('2d');ctx.scale(.5,.5);
  ctx.save();ctx.globalAlpha=.18;ctx.filter='blur(5px)';ctx.drawImage(detail,x,y);ctx.restore();
  ctx.drawImage(detail,x,y);detail.width=1;detail.height=1;
  canvas.className='tdb-senses-chair-glare';canvas.setAttribute('aria-hidden','true');return canvas;
}

function makeSurface(images,state){
  const canvas=document.createElement('canvas');canvas.width=PHOTO_WIDTH;canvas.height=PHOTO_HEIGHT;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.drawImage(state.touch?images.warm:images.clinical,0,0,PHOTO_WIDTH,PHOTO_HEIGHT);
  chairColour(ctx,state);
  if(!state.sight)floorReflections(ctx);
  if(!state.sight)coldLighting(ctx);
  
  canvas.className='tdb-senses-photo-image';canvas.setAttribute('aria-hidden','true');
  return canvas;
}


function objectTone(ctx,state,rect,clinical=false){
  // Grade the object pixels themselves so pale labels and cushions follow Sight.
  // Preserve glass/material colour and alpha; never paint a rectangular overlay.
  const [x,y,w,h]=rect,pixels=ctx.getImageData(x,y,w,h),data=pixels.data;
  const saturation=clinical?.85:state.sight?.9:.55;
  const channels=state.sight?[1.035,1.005,.965]:clinical?[.96,1,1.045]:[.88,1.005,1.14];
  for(let i=0;i<data.length;i+=4){
    if(!data[i+3])continue;
    const light=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
    for(let c=0;c<3;c++)data[i+c]=(light+(data[i+c]-light)*saturation)*channels[c];
  }
  ctx.putImageData(pixels,x,y);
}

function objectLayer(images,state,sense){
  const canvas=document.createElement('canvas');canvas.width=PHOTO_WIDTH;canvas.height=PHOTO_HEIGHT;
  canvas.className='tdb-senses-object';canvas.dataset.sense=sense==='candle'?'smell':sense;
  canvas.dataset.tone=state.sight?'warm':'cold';
  const ctx=canvas.getContext('2d');
  if(sense==='smell'){canvas.dataset.anchor='245,560';contactShadow(ctx,227,829,92,.32,.19);ctx.save();ctx.filter='blur(3px) saturate(.76) contrast(.88) brightness(1.06)';ctx.drawImage(images.objects,0,211,585,733,0,252,525,585);ctx.restore();}
  if(sense==='sound'){
    canvas.dataset.anchor='538,1195';
    contactShadow(ctx,530,1265,136,.25,.24);
    ctx.drawImage(images.objects,280,1145,375,240,350,1075,375,240);
    objectTone(ctx,state,[350,1075,375,240]);
  }
  if(sense==='taste'){
    canvas.dataset.anchor='804,124';
    canvas.dataset.object=state.taste?'aesop':'clinical-dispenser-and-sharps';
    if(state.taste){
      contactShadow(ctx,806,188,44,.4,.15);ctx.drawImage(images.objects,743,30,108,177,759,45,89,158);
      objectTone(ctx,state,[759,45,89,158]);
    }else{
      contactShadow(ctx,816,201,66,.26,.14);
      ctx.save();ctx.filter='blur(.5px) brightness(.87)';ctx.drawImage(images.tasteClinical,753,50,128,153);ctx.restore();
      objectTone(ctx,state,[753,50,128,153],true);
    }
  }
  if(sense==='candle'){
    canvas.dataset.anchor='428,150';canvas.dataset.object='candle';
    contactShadow(ctx,429,203,30,.22,.16);
    ctx.save();ctx.filter='blur(.65px) brightness(.9) saturate(.85)';ctx.drawImage(images.candle,405,135,48,68);ctx.restore();
    objectTone(ctx,state,[405,135,48,68]);
  }
  return canvas;
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
    const photo=document.createElement('div');photo.className='tdb-senses-photo';const surface=makeSurface(this.images,state);photo.append(surface);
    if(!state.sight)photo.append(chairGlare(surface));
    for(const sense of ['smell','sound','taste'])if(state[sense]||sense==='taste')photo.append(objectLayer(this.images,state,sense));
    if(state.smell)photo.append(objectLayer(this.images,state,'candle'));
    if(state.smell){const motes=document.createElement('div');motes.className='tdb-senses-motes';motes.innerHTML=[0,1,2,3,4,5].map(i=>`<i class="leaf" style="left:${10+i*9.1}%;top:${27+(i*11)%38}%;animation-delay:${-i*3.4}s;animation-duration:${19+i*1.7}s"></i>`).join('');photo.append(motes);}
    if(!state.smell){const haze=document.createElement('div');haze.className='tdb-senses-haze';haze.setAttribute('aria-hidden','true');photo.append(haze);}
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
  reveal(state,origin,{duration,reverse=false,reduced,onProgress,doublePulse=false}){
    this.active?.finish(false);
    const next=this.scene(state),previous=this.current;
    if(next===previous)return Promise.resolve(true);
    // ON: the new scene grows over the old. OFF: the current scene contracts
    // over the full new scene beneath it, all the way back into the control.
    const contracting=reverse&&!reduced&&!!previous;
    const ring=document.createElement('div');ring.className='tdb-senses-reveal-ring';
    Object.assign(ring.style,{left:`${origin.x}px`,top:`${origin.y}px`});
    const leading=doublePulse&&!reduced?ring.cloneNode():null;
    const delay=leading?175:0,total=duration+delay;
    const maskNode=contracting?previous.node:next.node,feather=20,endRadius=revealRadius(this.width,this.height,origin,feather);
    maskNode.classList.add('tdb-senses-revealing');
    maskNode.style.setProperty('--tdb-senses-origin-x',`${origin.x}px`);maskNode.style.setProperty('--tdb-senses-origin-y',`${origin.y}px`);
    maskNode.style.setProperty('--tdb-senses-feather',`${feather}px`);maskNode.style.setProperty('--tdb-senses-reveal-radius',`${contracting?endRadius:-12}px`);
    this.stage.dataset.radiusEnd=String(endRadius);this.stage.dataset.origin=JSON.stringify(origin);this.stage.dataset.direction=contracting?'contract':'expand';
    if(reduced){maskNode.classList.remove('tdb-senses-revealing');maskNode.style.opacity='0';}
    if(contracting)this.stage.replaceChildren(next.node,maskNode);else this.stage.append(next.node);
    if(!reduced)this.stage.append(...(leading?[leading,ring]:[ring]));
    return new Promise(resolve=>{
      const active={next,animation:null,frame:0,timers:[],done:false,finish:complete=>{
        if(active.done)return;active.done=true;ring.remove();leading?.remove();active.timers.forEach(clearTimeout);cancelAnimationFrame(active.frame);
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
          if(active.done||this.disposed)return;
          const elapsed=now-start,p=Math.max(0,Math.min(1,(elapsed-delay)/duration));
          if(leading){
            const lp=Math.min(1,elapsed/duration),size=Math.max(0,(-12+lp*(endRadius+12))*2);
            leading.style.width=size+'px';leading.style.height=size+'px';
            leading.style.opacity=lp===1?'0':'1';
            ring.style.visibility=elapsed<delay?'hidden':'visible';
          }
          const radius=contracting?endRadius-p*(endRadius+12):-12+p*(endRadius+12);
          maskNode.style.setProperty('--tdb-senses-reveal-radius',`${radius.toFixed(2)}px`);
          const diameter=Math.max(0,radius*2);ring.style.width=`${diameter}px`;ring.style.height=`${diameter}px`;
          if(p===1)active.finish(true);else active.frame=requestAnimationFrame(tick);
        };active.frame=requestAnimationFrame(tick);
      }
      for(const p of [.25,.5,.75])active.timers.push(setTimeout(()=>{if(!active.done)onProgress?.(p);},total*p));
      active.timers.push(setTimeout(()=>active.finish(true),total+80));
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
