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
      'M677 483C654 480 638 489 621 500L596 525L571 550L549 575L528 600L491 650L457 700C440 730 426 764 426 788C425 808 434 828 444 850C455 869 471 886 486 903C511 923 529 940 544 952C565 969 581 981 598 989C661 1033 745 1058 826 1055C899 1055 973 1023 1021 983C1059 957 1080 951 1086 937L1086 634C1070 587 1050 546 1020 528C991 511 955 511 913 522C861 536 814 529 763 512C735 503 698 485 677 483Z',
      'M96 1448L114 1400L143 1350L184 1300L228 1250L276 1200L333 1150L388 1108L423 1080L435 1060Q458 1042 491 1053Q522 1044 555 1060Q582 1057 614 1069C697 1090 789 1119 879 1134Q910 1128 939 1144L914 1190L889 1240Q875 1264 883 1278Q905 1298 938 1299L954 1286Q978 1308 986 1332Q995 1361 979 1401L963 1448Z'
    ];
    m.filter='blur(.6px)';m.lineWidth=2;m.strokeStyle='#fff';paths.forEach(path=>{const contour=new Path2D(path);m.fill(contour);m.stroke(contour);});
    mask=m.getImageData(0,0,PHOTO_WIDTH,PHOTO_HEIGHT).data;
    region.width=1;region.height=1;
  }
  for(let y=298;y<PHOTO_HEIGHT;y++)for(let x=84;x<PHOTO_WIDTH;x++){
    const i=(y*PHOTO_WIDTH+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    let amount=state.touch?mask[i+3]/255:Math.min(1,Math.max(0,(b-r-8)/17))*Math.min(1,Math.max(0,(b-g-3)/9));
    // At the backrest's bottom contour, keep the pale metal support outside
    // the blue while including the dark upholstered lip above it.
    if(state.touch&&y>1008&&y<1060&&x>600&&x<915){
      const edgeLight=.2126*r+.7152*g+.0722*b;
      amount*=Math.min(1,Math.max(0,(95-edgeLight)/25));
    }
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

// A separate alpha surface reflects the existing prop pixels onto the counter.
// The counter remains visible; the sink bowl and front fascia cannot receive it.
function counterReflection(ctx,image,source,placement,{depth=30,opacity=.18,amber=false}={}){
  const [sx,sy,sw,sh]=source,[x,y,w,h]=placement;
  const layer=document.createElement('canvas');layer.width=PHOTO_WIDTH;layer.height=PHOTO_HEIGHT;
  const c=layer.getContext('2d');
  c.save();c.translate(x,y);c.scale(1,-depth/h);
  c.drawImage(image,sx,sy,sw,sh,0,-h,w,h);c.restore();
  c.globalCompositeOperation='destination-in';
  const fade=c.createLinearGradient(0,y,0,y+depth);
  fade.addColorStop(0,`rgba(0,0,0,${opacity})`);fade.addColorStop(.5,`rgba(0,0,0,${opacity*.45})`);fade.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=fade;c.fillRect(x-4,y-1,w+8,depth+3);
  if(amber){
    c.globalCompositeOperation='source-over';c.save();c.translate(x+w*.5,y+depth*.4);c.scale(1,.42);
    const glow=c.createRadialGradient(0,0,0,0,0,w*.43);glow.addColorStop(0,'rgba(255,204,116,.26)');glow.addColorStop(1,'rgba(255,175,60,0)');
    c.fillStyle=glow;c.fillRect(-w/2,-w/2,w,w);c.restore();
  }
  ctx.save();ctx.beginPath();ctx.moveTo(368,211);ctx.lineTo(503,142);ctx.lineTo(1086,177);ctx.lineTo(1086,274);ctx.lineTo(370,230);ctx.closePath();
  ctx.ellipse(601,185,148,29,.025,0,Math.PI*2);ctx.clip('evenodd');
  ctx.filter='blur(1.3px)';ctx.drawImage(layer,0,0);ctx.restore();layer.width=1;layer.height=1;
}

// Fit the visible object, not its transparent export rectangle. Grounding and
// perspective therefore remain consistent across props with different padding.
function groundedProp(ctx,image,source,{x,y,width,height,slope=0,angle=0,shadow=.25,reflection=null}){
  const crop=document.createElement('canvas');crop.width=source[2];crop.height=source[3];
  const c=crop.getContext('2d');c.drawImage(image,...source,0,0,crop.width,crop.height);
  const pixels=c.getImageData(0,0,crop.width,crop.height).data;
  let left=crop.width,top=crop.height,right=0,bottom=0;
  for(let py=0;py<crop.height;py++)for(let px=0;px<crop.width;px++)if(pixels[(py*crop.width+px)*4+3]>20){left=Math.min(left,px);right=Math.max(right,px+1);top=Math.min(top,py);bottom=Math.max(bottom,py+1);}
  if(right<=left||bottom<=top)return;
  const sw=right-left,sh=bottom-top,scale=Math.min(width/sw,height/sh),w=sw*scale,h=sh*scale;
  if(reflection){
    // Separate disconnected silhouettes so each reflection meets its own base.
    const columns=[];
    for(let px=left;px<right;px++){
      let bottomY=0;
      for(let py=top;py<bottom;py++)if(pixels[(py*crop.width+px)*4+3]>35)bottomY=py+1;
      columns.push(bottomY);
    }
    let start=-1;
    for(let i=0;i<=columns.length;i++){
      if(i<columns.length&&columns[i]){if(start<0)start=i;}
      else if(start>=0){
        const end=i,base=Math.max(...columns.slice(start,end));
        if(end-start>2)counterReflection(ctx,crop,[left+start,top,end-start,base-top],
          [x-w/2+start*scale,y-h+(base-top)*scale,(end-start)*scale,(base-top)*scale],reflection);
        start=-1;
      }
    }
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.transform(1,slope,0,1,0,0);
  contactShadow(ctx,0,0,w*.48,shadow,.14);
  ctx.drawImage(crop,left,top,sw,sh,-w/2,-h,w,h);ctx.restore();crop.width=1;crop.height=1;
}

function objectLayer(images,state,sense){
  const canvas=document.createElement('canvas');canvas.width=PHOTO_WIDTH;canvas.height=PHOTO_HEIGHT;
  canvas.className='tdb-senses-object';canvas.dataset.sense=sense==='candle'?'smell':sense;
  canvas.dataset.tone=state.sight?'warm':'cold';
  const ctx=canvas.getContext('2d');
  if(sense==='smell'){
    canvas.dataset.anchor='227,550';ctx.save();ctx.filter='blur(3px) saturate(.76) contrast(.88) brightness(1.06)';
    groundedProp(ctx,images.objects,[0,211,585,733],{x:227,y:829,width:525,height:585,slope:.03,shadow:.25});ctx.restore();
  }
  if(sense==='sound'){
    canvas.dataset.anchor='468,1265';
    contactShadow(ctx,459,1335,136,.25,.24);
    ctx.drawImage(images.objects,280,1145,375,240,280,1145,375,240);
    objectTone(ctx,state,[280,1145,375,240]);
  }
  if(sense==='taste'){
    canvas.dataset.anchor='804,124';canvas.dataset.object=state.taste?'aesop':'clinical-dispenser-and-sharps';
    ctx.save();ctx.filter=state.taste?'none':'blur(.85px)';
    if(state.taste){counterReflection(ctx,images.objects,[743,30,108,177],[759,203,89,158],{depth:34,opacity:.18});contactShadow(ctx,806,188,44,.4,.15);ctx.drawImage(images.objects,743,30,108,177,759,45,89,158);}
    else groundedProp(ctx,images.tasteClinical,[0,0,images.tasteClinical.width,images.tasteClinical.height],{x:807,y:206,width:130,height:126,slope:0,shadow:.12,reflection:{depth:34,opacity:.24}});
    ctx.restore();objectTone(ctx,state,[737,25,175,235],!state.taste);
  }
  if(sense==='candle'){
    canvas.dataset.anchor='424,189';canvas.dataset.object='candle';
    ctx.save();ctx.filter='blur(.65px) saturate(.9)';
    groundedProp(ctx,images.candle,[0,0,images.candle.width,images.candle.height],{x:424,y:216,width:46,height:62,slope:0,shadow:.12,reflection:{depth:18,opacity:.24,amber:true}});
    ctx.restore();objectTone(ctx,state,[388,145,80,93]);
  }
  return canvas;
}


export class SceneRenderer{
  constructor(stage,images,report){
    this.stage=stage;this.images=images;this.report=report;this.cache=new Map();this.surfaces=new Map();this.current=null;this.active=null;this.builds=0;this.disposed=false;
    stage.dataset.renderer='prepared-scenes';stage.dataset.maskDriver='radius-only-raf';
    this.resize();
  }
  prepared(state){
    const key=Number(state.sight)+':'+Number(state.touch);
    let entry=this.surfaces.get(key);
    if(entry)this.surfaces.delete(key);
    else{const surface=makeSurface(this.images,state);entry={surface,glare:state.sight?null:chairGlare(surface)};}
    this.surfaces.set(key,entry);
    // Two photographic backgrounds cover object-only toggles and the latest
    // lighting/material reversal. Scene copies remain independently maskable.
    while(this.surfaces.size>2){const [oldKey,old]=this.surfaces.entries().next().value;for(const canvas of [old.surface,old.glare])if(canvas){canvas.width=1;canvas.height=1;}this.surfaces.delete(oldKey);}
    return entry;
  }
  scene(state){
    const key=['sight','sound','smell','touch','taste'].map(k=>Number(state[k])).join('');
    if(this.cache.has(key)){const scene=this.cache.get(key);this.cache.delete(key);this.cache.set(key,scene);return scene;}
    const started=performance.now(),node=document.createElement('div');node.className='tdb-senses-scene';node.dataset.state=key;node.dataset.sight=state.sight?'warm':'cold';
    const photo=document.createElement('div');photo.className='tdb-senses-photo';
    const prepared=this.prepared(state);
    for(const source of [prepared.surface,prepared.glare])if(source){
      const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;canvas.className=source.className;canvas.setAttribute('aria-hidden','true');canvas.getContext('2d').drawImage(source,0,0);photo.append(canvas);
    }
    for(const sense of ['smell','sound','taste'])if(state[sense]||sense==='taste')photo.append(objectLayer(this.images,state,sense));
    if(state.smell)photo.append(objectLayer(this.images,state,'candle'));
    const air=document.createElement('div');air.setAttribute('aria-hidden','true');
    air.className=`tdb-senses-motes ${state.smell?'tdb-senses-botanicals':'tdb-senses-dust'}`;
    if(state.smell){
      const blossom=`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor">${[0,72,144,216,288].map(a=>`<ellipse cx="12" cy="7.4" rx="3.1" ry="4.4" transform="rotate(${a} 12 12)"/>`).join('')}</g><circle cx="12" cy="12" r="2.3" fill="#cbbb7c"/></svg>`;
      const leaves='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21Q9 13 14 4" fill="none" stroke="#91a578" stroke-width="1"/><path d="M12 14Q3 14 5 7Q12 7 12 14M12 11Q13 3 20 3Q20 10 12 11" fill="#91a578"/></svg>';
      air.innerHTML=Array.from({length:9},(_,i)=>`<i class="${i===3||i===7?'sprig':'blossom'}" style="left:${23+(i*17)%51}%;top:${26+(i*13)%45}%;--mote-size:${13+i%3*2}px;--mote-colour:${i%3===0?'#e9d5d3':'#f1e9d5'};animation-delay:${-i*3.8}s;animation-duration:${20+i*1.4}s">${i===3||i===7?leaves:blossom}</i>`).join('');
    }else{
      const haze=document.createElement('div');haze.className='tdb-senses-haze';haze.setAttribute('aria-hidden','true');photo.append(haze);
      air.innerHTML=Array.from({length:26},(_,i)=>`<i class="spore" style="left:${18+(i*19.7)%68}%;top:${17+(i*13.3)%60}%;--mote-size:${2+i%4}px;--mote-blur:${.3+i%3*.45}px;--mote-alpha:${.14+i%4*.06};animation-delay:${-i*2.7}s;animation-duration:${24+i%7*2}s"></i>`).join('');
    }
    photo.append(air);
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
    this.surfaces.forEach(entry=>{for(const canvas of [entry.surface,entry.glare])if(canvas){canvas.width=1;canvas.height=1;}});
    this.surfaces.clear();this.cache.clear();this.current=null;this.images=null;
  }
}
