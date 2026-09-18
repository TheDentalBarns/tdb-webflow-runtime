/* Cached photographic composites. Ambient motion shares one timeline across scenes. */
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

function coldLighting(ctx,state){
  // This grading and all glare are baked once, never filtered during the reveal.
  ctx.save();ctx.globalCompositeOperation='copy';ctx.filter='saturate(.79) contrast(1.085) brightness(1.105)';
  ctx.drawImage(ctx.canvas,0,0);ctx.restore();
  ctx.save();ctx.globalCompositeOperation='color';ctx.fillStyle='rgba(134,169,208,.23)';ctx.fillRect(0,0,PHOTO_WIDTH,PHOTO_HEIGHT);ctx.restore();

  // Cores follow measured edges in the registered plate, not viewport offsets.
  // Blur the emitter itself as well as its halo, so no drawn white edge survives.
  function strip(x1,y1,x2,y2){
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
    for(const [width,blur,colour] of [[28,24,'rgba(207,229,245,.30)'],[14,12,'rgba(219,237,249,.36)'],[7,5,'rgba(234,246,254,.64)'],[3,2.6,'rgba(252,254,255,.90)']]){
      ctx.lineWidth=width;ctx.strokeStyle=colour;ctx.filter=`blur(${blur}px)`;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    }
    ctx.restore();
  }
  // The front edge drops 55px across the plate. Seat the light in the underside.
  const start={x:382,y:231},end={x:1086,y:286};
  // Light falls down the cupboard plane; grain and joints remain visible.
  ctx.save();ctx.beginPath();ctx.moveTo(382,234);ctx.lineTo(1086,289);ctx.lineTo(1086,389);ctx.lineTo(391,334);ctx.closePath();
  if(state.touch){ctx.moveTo(714,387);ctx.bezierCurveTo(716,359,733,332,760,319);ctx.bezierCurveTo(779,310,791,313,813,317);ctx.bezierCurveTo(846,321,887,320,921,324);ctx.bezierCurveTo(945,328,955,346,960,371);ctx.bezierCurveTo(967,403,959,439,942,461);ctx.lineTo(878,487);ctx.lineTo(800,479);ctx.lineTo(723,443);ctx.closePath();}
  else{ctx.moveTo(717,401);ctx.bezierCurveTo(718,350,748,304,789,301);ctx.bezierCurveTo(823,296,879,302,903,307);ctx.bezierCurveTo(939,313,957,339,958,377);ctx.lineTo(957,437);ctx.lineTo(914,489);ctx.lineTo(783,487);ctx.lineTo(718,446);ctx.closePath();}
  ctx.clip('evenodd');
  ctx.translate(382,234);ctx.transform(1,55/704,0,1,0,0);
  const spill=ctx.createLinearGradient(0,0,-8,100);
  spill.addColorStop(0,'rgba(226,240,250,.23)');spill.addColorStop(.35,'rgba(226,240,250,.10)');spill.addColorStop(1,'rgba(226,240,250,0)');
  ctx.globalCompositeOperation='screen';ctx.fillStyle=spill;ctx.fillRect(0,0,704,100);ctx.restore();

  // A broad, soft reflection on the worktop, with the sink bowl excluded.
  ctx.save();ctx.beginPath();ctx.moveTo(368,211);ctx.lineTo(503,142);ctx.lineTo(1086,177);ctx.lineTo(1086,274);ctx.lineTo(370,230);ctx.closePath();
  ctx.ellipse(601,185,148,29,.025,0,Math.PI*2);ctx.clip('evenodd');
  ctx.globalCompositeOperation='screen';
  const topLight=ctx.createLinearGradient(0,146,0,275);
  topLight.addColorStop(0,'rgba(227,242,252,.18)');topLight.addColorStop(.5,'rgba(227,242,252,.09)');topLight.addColorStop(1,'rgba(227,242,252,0)');
  ctx.fillStyle=topLight;ctx.fillRect(368,142,718,140);ctx.restore();
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
      'M677 481C654 479 638 487 621 498L596 525L571 550L549 575L528 600L491 650L457 700C440 730 426 764 426 788C425 808 434 828 444 850C455 869 471 886 486 903C511 923 529 940 544 952C565 969 581 981 598 989L600 997Q625 1010 650 1018Q675 1026 700 1032Q750 1045 800 1051Q838 1058 875 1052C933 1030 980 1006 1021 983C1059 957 1080 951 1086 937L1086 634C1070 587 1050 545 1020 531C991 513 965 509 940 513C910 518 893 525 867 525C825 525 794 519 763 507C731 495 701 481 677 481Z',
      'M96 1448L114 1400L143 1350L184 1300L228 1250L276 1200L333 1150L388 1108C425 1085 457 1064 486 1055C509 1048 534 1048 555 1060Q582 1057 614 1069C697 1090 789 1119 879 1134Q910 1128 939 1144L914 1190L889 1240Q875 1264 883 1278Q905 1298 938 1299L954 1286Q978 1308 986 1332Q995 1361 979 1401L963 1448Z'
    ];
    m.filter='blur(.6px)';m.lineWidth=2;m.strokeStyle='#fff';paths.forEach(path=>{const contour=new Path2D(path);m.fill(contour);m.stroke(contour);});
    mask=m.getImageData(0,0,PHOTO_WIDTH,PHOTO_HEIGHT).data;
    region.width=1;region.height=1;
  }
  for(let y=298;y<PHOTO_HEIGHT;y++)for(let x=84;x<PHOTO_WIDTH;x++){
    const i=(y*PHOTO_WIDTH+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    let amount=state.touch?mask[i+3]/255:Math.min(1,Math.max(0,(b-r-8)/17))*Math.min(1,Math.max(0,(b-g-3)/9));
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
  if(!state.sight)coldLighting(ctx,state);
  
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


// Keep the expensive colour/mask/reflection work out of sense-button events.
// Small transparent sprites are prepared once, then flattened into each scene.
const OBJECT_BOUNDS={smell:[0,180,535,710],sound:[270,1135,400,255],taste:[730,15,195,260],candle:[380,130,100,115]};
function croppedArtwork(source,[x,y,width,height],scale=1){
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
  canvas.getContext('2d').drawImage(source,x*scale,y*scale,width*scale,height*scale,0,0,canvas.width,canvas.height);
  source.width=1;source.height=1;return{canvas,x,y,width,height};
}
class PreparedArtwork{
  constructor(images){this.images=images;this.surfaces=new Map();this.objects=new Map();this.disposed=false;}
  surface(state){
    const key=Number(state.sight)+':'+Number(state.touch);
    if(!this.surfaces.has(key)){
      const surface=makeSurface(this.images,state);
      const glare=state.sight?null:croppedArtwork(chairGlare(surface),[700,284,286,230],.5);
      this.surfaces.set(key,{surface,glare});
    }
    return this.surfaces.get(key);
  }
  object(state,sense){
    const key=sense==='smell'?'plant':sense+':'+Number(state.sight)+(sense==='taste'?':'+Number(state.taste):'');
    if(!this.objects.has(key))this.objects.set(key,croppedArtwork(objectLayer(this.images,state,sense),OBJECT_BOUNDS[sense]));
    return this.objects.get(key);
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;
    for(const {surface,glare} of this.surfaces.values()){surface.width=surface.height=1;if(glare)glare.canvas.width=glare.canvas.height=1;}
    for(const {canvas} of this.objects.values())canvas.width=canvas.height=1;
    this.surfaces.clear();this.objects.clear();this.images=null;
  }
}

// Independent channels use the same spatial mask in the photograph, props and air.
// A repeated tap retargets its existing radius; work stays bounded at five waves.
export const RIPPLE_SENSES=['sight','sound','smell','touch','taste'];
export const rippleEase=p=>1-Math.pow(1-Math.max(0,Math.min(1,p)),2.2);
export class RippleField{
  constructor(state={}){this.state={...state};this.waves=new Map();}
  sample(sense,now){
    const w=this.waves.get(sense);
    if(!w)return{amount:Number(!!this.state[sense]),radial:false,ring:0,progress:1};
    const p=Math.max(0,Math.min(1,(now-w.start)/w.duration)),e=rippleEase(p);
    return{...w,elapsed:now-w.start,progress:p,radial:!w.reduced,radius:w.from+(w.to-w.from)*e,amount:w.fromAmount+(Number(w.target)-w.fromAmount)*e,
      ring:w.reduced?0:Math.min(1,p*14)*Math.min(1,(1-p)*6),
      echo:w.echo&&now>=w.start+w.delay&&now<w.start+w.delay+w.duration?{radius:w.edge+rippleEase((now-w.start-w.delay)/w.duration)*(w.end-w.edge),alpha:Math.min(1,Math.max(0,(now-w.start-w.delay)/w.duration)*14)*Math.min(1,Math.max(0,1-(now-w.start-w.delay)/w.duration)*6)*.55}:null};
  }
  start(sense,target,origin,end,now,{duration,reduced=false,doublePulse=false}={}){
    const edge=origin.radius??0;
    const previous=this.waves.get(sense),at=this.sample(sense,now),from=at.radial?at.radius:at.amount?end:edge;
    const wave={sense,target,origin:{...origin},edge,end,from,to:target?end:edge,fromAmount:at.amount,start:now,duration,
      reduced,delay:doublePulse&&!reduced&&!previous?600:0,echo:doublePulse&&!reduced&&!previous};
    this.waves.set(sense,wave);return wave;
  }
  settle(sense){const w=this.waves.get(sense);if(w){this.state[sense]=w.target;this.waves.delete(sense);}return w;}
  samples(now){return RIPPLE_SENSES.map(sense=>this.sample(sense,now));}
}

function gateStyle(samples,gates){
  const masks=[];let opacity=1;
  for(const [index,invert=false] of gates){
    const s=samples[index];
    if(!s.radial){opacity*=invert?1-s.amount:s.amount;continue;}
    if(!s.cssMasks){
      const r=s.radius.toFixed(2),x=s.origin.x.toFixed(2),y=s.origin.y.toFixed(2);
      const low=Math.max(0,Number(r)-10),high=Math.max(.01,Number(r)+10);
      s.cssMasks=[`radial-gradient(circle at ${x}px ${y}px,#000 ${low}px,#0000 ${high}px)`,`radial-gradient(circle at ${x}px ${y}px,#0000 ${low}px,#000 ${high}px)`];
    }
    masks.push(s.cssMasks[Number(invert)]);
  }
  return{visibility:opacity===0?'hidden':'visible',opacity:String(opacity),maskImage:masks.join(',')||'none',webkitMaskImage:masks.join(',')||'none'};
}

const VERTEX_SHADER='attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=vec2((aPosition.x+1.0)*.5,(1.0-aPosition.y)*.5);gl_Position=vec4(aPosition,0.0,1.0);}';
// Five texture units: four registered material/light plates and one alpha atlas.
// Premultiplied sprites retain the approved translucent shadows/reflections.
export const RIPPLE_FRAGMENT_SHADER=`
precision highp float;
varying vec2 vUV;
uniform sampler2D uBase0,uBase1,uBase2,uBase3,uAtlas;
uniform vec2 uViewport;
uniform vec4 uPhoto;
uniform vec4 uWave[5];
uniform vec2 uState[5];
uniform vec4 uEcho;
float maskValue(vec2 p,vec4 w,vec2 s){return s.x<0.0?1.0-smoothstep(w.z-10.0,w.z+10.0,length(p-w.xy)):s.x;}
vec4 sprite(vec2 p,vec4 bounds,vec2 atlas){
  vec2 q=(p-bounds.xy)/bounds.zw;
  if(q.x<0.0||q.y<0.0||q.x>1.0||q.y>1.0)return vec4(0.0);
  return texture2D(uAtlas,(atlas+q*bounds.zw)/1024.0);
}
vec4 over(vec4 under,vec4 top){return top+under*(1.0-top.a);}
vec3 ring(vec3 colour,vec2 p,vec4 w){
  if(abs(w.w)<=0.0||w.z<=0.0)return colour;
  float d=length(p-w.xy)-w.z;
  float wash=(1.0-smoothstep(0.0,180.0,-d))*smoothstep(0.0,4.0,-d)*w.w*.8;
  float line=(1.0-smoothstep(.28,1.2,abs(d)))*abs(w.w)*.8;
  if(w.w>0.0)colour=mix(colour,vec3(1.0),wash);
  else colour*=1.0-(1.0-smoothstep(0.0,90.0,-d))*smoothstep(1.0,5.0,-d)*abs(w.w)*.18;
  return mix(colour,vec3(.961,.945,.902),line);
}
vec4 lightPlate(vec2 uv,float sight,bool plush){
  if(sight<=0.0)return plush?texture2D(uBase2,uv):texture2D(uBase0,uv);
  if(sight>=1.0)return plush?texture2D(uBase3,uv):texture2D(uBase1,uv);
  return plush?mix(texture2D(uBase2,uv),texture2D(uBase3,uv),sight):mix(texture2D(uBase0,uv),texture2D(uBase1,uv),sight);
}
vec4 tonedSprite(vec2 photo,vec4 bounds,vec2 cold,vec2 warm,float sight){
  if(sight<=0.0)return sprite(photo,bounds,cold);
  if(sight>=1.0)return sprite(photo,bounds,warm);
  return mix(sprite(photo,bounds,cold),sprite(photo,bounds,warm),sight);
}
void main(){
  vec2 p=vUV*uViewport,uv=(p-uPhoto.xy)/uPhoto.zw,photo=uv*vec2(1086.0,1448.0);
  float sight=maskValue(p,uWave[0],uState[0]),sound=maskValue(p,uWave[1],uState[1]);
  float smell=maskValue(p,uWave[2],uState[2]),touch=maskValue(p,uWave[3],uState[3]),taste=maskValue(p,uWave[4],uState[4]);
  vec4 colour;
  if(touch<=0.0)colour=lightPlate(uv,sight,false);
  else if(touch>=1.0)colour=lightPlate(uv,sight,true);
  else colour=mix(lightPlate(uv,sight,false),lightPlate(uv,sight,true),touch);
  if(smell>0.0)colour=over(colour,sprite(photo,vec4(0.0,180.0,535.0,710.0),vec2(2.0,2.0))*smell);
  if(sound>0.0)colour=over(colour,tonedSprite(photo,vec4(270.0,1135.0,400.0,255.0),vec2(539.0,2.0),vec2(539.0,259.0),sight)*sound);
  vec4 props;
  if(taste<=0.0)props=tonedSprite(photo,vec4(730.0,15.0,195.0,260.0),vec2(2.0,716.0),vec2(201.0,716.0),sight);
  else if(taste>=1.0)props=tonedSprite(photo,vec4(730.0,15.0,195.0,260.0),vec2(400.0,716.0),vec2(599.0,716.0),sight);
  else props=mix(tonedSprite(photo,vec4(730.0,15.0,195.0,260.0),vec2(2.0,716.0),vec2(201.0,716.0),sight),tonedSprite(photo,vec4(730.0,15.0,195.0,260.0),vec2(400.0,716.0),vec2(599.0,716.0),sight),taste);
  colour=over(colour,props);
  if(smell>0.0)colour=over(colour,tonedSprite(photo,vec4(380.0,130.0,100.0,115.0),vec2(798.0,716.0),vec2(900.0,716.0),sight)*smell);
  for(int i=0;i<5;i++)colour.rgb=ring(colour.rgb,p,uWave[i]);
  colour.rgb=ring(colour.rgb,p,uEcho);
  gl_FragColor=vec4(colour.rgb,1.0);
}`;

class GPUComposite{
  constructor(art){
    this.canvas=document.createElement('canvas');this.canvas.className='tdb-senses-gpu';
    const gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl)throw new Error('WebGL unavailable');
    this.gl=gl;this.textures=[];
    try{
      const program=gl.createProgram(),vertex=gl.createShader(gl.VERTEX_SHADER),fragment=gl.createShader(gl.FRAGMENT_SHADER);this.program=program;
      gl.shaderSource(vertex,VERTEX_SHADER);gl.shaderSource(fragment,RIPPLE_FRAGMENT_SHADER);gl.compileShader(vertex);gl.compileShader(fragment);
      gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.bindAttribLocation(program,0,'aPosition');gl.linkProgram(program);
      gl.deleteShader(vertex);gl.deleteShader(fragment);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader unavailable');
      gl.useProgram(program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      this.uniforms={};for(const name of ['uViewport','uPhoto','uWave[0]','uState[0]','uEcho'])this.uniforms[name]=gl.getUniformLocation(program,name);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      for(const [index,sight,touch] of [[0,false,false],[1,true,false],[2,false,true],[3,true,true]])this.texture(art.surface({sight,touch}).surface,index,'uBase'+index);
      const atlas=document.createElement('canvas');atlas.width=atlas.height=1024;const ctx=atlas.getContext('2d');
      for(const [sense,sight,taste,x,y] of [['smell',true,true,2,2],['sound',false,true,539,2],['sound',true,true,539,259],['taste',false,false,2,716],['taste',true,false,201,716],['taste',false,true,400,716],['taste',true,true,599,716],['candle',false,true,798,716],['candle',true,true,900,716]])ctx.drawImage(art.object({sight,taste},sense).canvas,x,y);
      this.texture(atlas,4,'uAtlas');atlas.width=atlas.height=1;
      if(gl.getError()!==gl.NO_ERROR)throw new Error('GPU texture allocation unavailable');
      this.waveData=new Float32Array(20);this.stateData=new Float32Array(10);this.echoData=new Float32Array(4);
    }catch(error){this.destroy();throw error;}
  }
  texture(source,index,name){
    const gl=this.gl,texture=gl.createTexture();this.textures.push(texture);gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform1i(gl.getUniformLocation(this.program,name),index);
  }
  resize(width,height,photo){
    // Source-quality ceiling, including high-DPI phones; never a 4K full-screen buffer.
    const ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(1600000/(width*height)),1086/photo.width*1.5);
    this.canvas.width=Math.max(1,Math.round(width*ratio));this.canvas.height=Math.max(1,Math.round(height*ratio));
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.gl.uniform2f(this.uniforms.uViewport,width,height);this.gl.uniform4f(this.uniforms.uPhoto,photo.x,photo.y,photo.width,photo.height);
  }
  draw(samples){
    const gl=this.gl;this.echoData.fill(0);
    samples.forEach((s,i)=>{const n=i*4;this.waveData[n]=s.origin?.x||0;this.waveData[n+1]=s.origin?.y||0;this.waveData[n+2]=s.radius||0;this.waveData[n+3]=(s.ring||0)*(s.target===false?-1:1);this.stateData[i*2]=s.radial?-1:s.amount;
      if(s.echo)this.echoData.set([s.origin.x,s.origin.y,s.echo.radius,s.echo.alpha]);});
    gl.uniform4fv(this.uniforms['uWave[0]'],this.waveData);gl.uniform2fv(this.uniforms['uState[0]'],this.stateData);gl.uniform4fv(this.uniforms.uEcho,this.echoData);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  destroy(){
    if(!this.gl)return;const gl=this.gl;for(const t of this.textures)gl.deleteTexture(t);if(this.buffer)gl.deleteBuffer(this.buffer);if(this.program)gl.deleteProgram(this.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();this.gl=null;this.canvas.remove();
  }
}

// A bounded fallback surface replaces full-screen CSS mask/blend stacks. Plates
// and small prop buffers are scaled once on resize, never resampled per frame.
export class RasterComposite{
  constructor(art){
    this.art=art;this.canvas=document.createElement('canvas');this.canvas.className='tdb-senses-raster';
    this.ctx=this.canvas.getContext('2d',{alpha:false});this.buffers=[];
  }
  buffer(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));this.buffers.push(c);return c;}
  resize(width,height,photo){
    for(const c of this.buffers)c.width=c.height=1;this.buffers=[];
    this.width=width;this.height=height;this.photo=photo;
    this.fullRatio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(1600000/(width*height)),1086/photo.width*1.5);
    this.ratio=Math.min(this.fullRatio,.75,Math.sqrt(185000/(width*height)));
    const w=Math.max(1,Math.round(width*this.ratio)),h=Math.max(1,Math.round(height*this.ratio));
    this.motionWidth=w;this.motionHeight=h;this.canvas.width=w;this.canvas.height=h;this.rx=w/width;this.ry=h/height;this.settledKey=null;
    this.plates=[];
    for(const touch of [false,true])for(const sight of [false,true]){
      const c=this.buffer(w,h),ctx=c.getContext('2d');
      ctx.drawImage(this.art.surface({sight,touch}).surface,photo.x*this.rx,photo.y*this.ry,photo.width*this.rx,photo.height*this.ry);this.plates.push(c);
    }
    this.material=this.buffer(w,h);this.light=this.buffer(w,h);this.masks=Array.from({length:5},()=>this.buffer(w,h));
    this.groups={};
    for(const sense of ['smell','sound','taste','candle']){
      const [x,y,sw,sh]=OBJECT_BOUNDS[sense],scale=photo.width/PHOTO_WIDTH;
      const bounds={x:photo.x+x*scale,y:photo.y+y*scale,width:sw*scale,height:sh*scale};
      const bw=Math.max(1,Math.ceil(bounds.width*this.rx)),bh=Math.max(1,Math.ceil(bounds.height*this.ry));
      const group={...bounds,plates:[],mix:this.buffer(bw,bh),temp:this.buffer(bw,bh),extra:this.buffer(bw,bh)};
      for(const taste of sense==='taste'?[false,true]:[true])for(const sight of [false,true]){
        const c=this.buffer(bw,bh);c.getContext('2d').drawImage(this.art.object({sight,taste},sense).canvas,0,0,bw,bh);group.plates.push(c);
      }
      this.groups[sense]=group;
    }
  }
  localSample(sample,bounds){
    if(!sample.radial)return sample;
    const {x,y,width,height}=bounds,ox=sample.origin.x,oy=sample.origin.y;
    const far=Math.hypot(Math.max(Math.abs(x-ox),Math.abs(x+width-ox)),Math.max(Math.abs(y-oy),Math.abs(y+height-oy)));
    if(far<=sample.radius-10)return{radial:false,amount:1};
    const near=Math.hypot(Math.max(x-ox,0,ox-x-width),Math.max(y-oy,0,oy-y-height));
    if(near>=sample.radius+10)return{radial:false,amount:0};
    return sample;
  }
  // One shared mask per active channel, reused by every affected prop. Surfaces
  // completely inside/outside the wave bypass mask creation and blending.
  mask(canvas,sample,invert=false,bounds=null){
    const ctx=canvas.getContext('2d');
    if(!sample.radial){
      const alpha=invert?1-sample.amount:sample.amount;if(alpha===1)return;
      if(alpha===0){ctx.clearRect(0,0,canvas.width,canvas.height);return;}
      ctx.save();ctx.globalCompositeOperation='destination-in';ctx.fillStyle=`rgba(0,0,0,${alpha})`;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();return;
    }
    if(!sample.rasterMask){
      const mask=this.masks[sample.rasterIndex],m=mask.getContext('2d');m.save();m.scale(this.rx,this.ry);
      const {x,y}=sample.origin,r=sample.radius,g=m.createRadialGradient(x,y,Math.max(0,r-10),x,y,Math.max(.01,r+10));
      for(let i=0;i<=8;i++){const p=i/8;g.addColorStop(p,`rgba(0,0,0,${1-p*p*(3-2*p)})`);}
      m.globalCompositeOperation='copy';m.fillStyle=g;m.fillRect(0,0,this.width,this.height);m.restore();sample.rasterMask=mask;
    }
    const sx=bounds?canvas.width/bounds.width:this.rx,sy=bounds?canvas.height/bounds.height:this.ry;
    ctx.save();ctx.globalCompositeOperation=invert?'destination-out':'destination-in';
    ctx.drawImage(sample.rasterMask,-(bounds?.x||0)*sx,-(bounds?.y||0)*sy,this.width*sx,this.height*sy);ctx.restore();
  }
  copy(target,source){const ctx=target.getContext('2d');ctx.globalCompositeOperation='copy';ctx.drawImage(source,0,0);ctx.globalCompositeOperation='source-over';return ctx;}
  opaqueLight(target,offset,sight){
    if(!sight.radial&&(sight.amount===0||sight.amount===1)){this.copy(target,this.plates[offset+sight.amount]);return;}
    const ctx=this.copy(target,this.plates[offset]);this.copy(this.light,this.plates[offset+1]);this.mask(this.light,sight);ctx.drawImage(this.light,0,0);
  }
  tone(group,offset,sight,target=group.mix){
    if(!sight.radial&&(sight.amount===0||sight.amount===1))return group.plates[offset+sight.amount];
    const ctx=this.copy(target,group.plates[offset]);this.mask(target,sight,true,group);
    this.copy(group.temp,group.plates[offset+1]);this.mask(group.temp,sight,false,group);
    ctx.globalCompositeOperation='lighter';ctx.drawImage(group.temp,0,0);ctx.globalCompositeOperation='source-over';return target;
  }
  drawSettled(samples){
    const key=samples.map(s=>s.amount).join('');if(this.settledKey===key)return;this.settledKey=key;
    const width=Math.max(1,Math.round(this.width*this.fullRatio)),height=Math.max(1,Math.round(this.height*this.fullRatio));
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
    const scaleX=width/this.width,scaleY=height/this.height,r=this.photo,ctx=this.ctx;
    const state=Object.fromEntries(RIPPLE_SENSES.map((k,i)=>[k,!!samples[i].amount]));
    ctx.globalCompositeOperation='copy';ctx.drawImage(this.art.surface(state).surface,r.x*scaleX,r.y*scaleY,r.width*scaleX,r.height*scaleY);ctx.globalCompositeOperation='source-over';
    for(const sense of ['smell','sound','taste','candle']){
      if(sense!=='taste'&&!(sense==='candle'?state.smell:state[sense]))continue;
      const sprite=this.art.object(state,sense),scale=r.width/PHOTO_WIDTH;
      ctx.drawImage(sprite.canvas,(r.x+sprite.x*scale)*scaleX,(r.y+sprite.y*scale)*scaleY,sprite.width*scale*scaleX,sprite.height*scale*scaleY);
    }
  }
  draw(samples){
    if(samples.every(s=>!s.radial&&(s.amount===0||s.amount===1))){this.drawSettled(samples);return;}
    this.settledKey=null;
    if(this.canvas.width!==this.motionWidth||this.canvas.height!==this.motionHeight){this.canvas.width=this.motionWidth;this.canvas.height=this.motionHeight;}
    for(let i=0;i<samples.length;i++)samples[i].rasterIndex=i;
    const viewport={x:0,y:0,width:this.width,height:this.height};
    const sight=this.localSample(samples[0],viewport),touch=this.localSample(samples[3],viewport),ctx=this.ctx;
    const [_,sound,smell,,taste]=samples;
    if(!touch.radial&&(touch.amount===0||touch.amount===1))this.opaqueLight(this.canvas,touch.amount*2,sight);
    else{
      this.opaqueLight(this.canvas,0,sight);this.opaqueLight(this.material,2,sight);this.mask(this.material,touch);ctx.drawImage(this.material,0,0);
    }
    for(const sense of ['smell','sound','taste','candle']){
      const group=this.groups[sense],rawGate=sense==='sound'?sound:sense==='taste'?null:smell;
      const gate=rawGate?this.localSample(rawGate,group):null;
      if(gate&&!gate.radial&&gate.amount===0)continue;
      const tone=this.localSample(sight,group),flavour=this.localSample(taste,group);let sprite;
      if(sense==='taste'&&(flavour.radial||flavour.amount>0&&flavour.amount<1)){
        const off=this.tone(group,0,tone,group.mix);if(off!==group.mix)this.copy(group.mix,off);this.mask(group.mix,flavour,true,group);
        const on=this.tone(group,2,tone,group.extra);if(on!==group.extra)this.copy(group.extra,on);this.mask(group.extra,flavour,false,group);
        const g=group.mix.getContext('2d');g.globalCompositeOperation='lighter';g.drawImage(group.extra,0,0);g.globalCompositeOperation='source-over';sprite=group.mix;
      }else sprite=this.tone(group,sense==='taste'?flavour.amount*2:0,tone);
      if(gate&&(gate.radial||gate.amount!==1)){if(sprite!==group.mix)this.copy(group.mix,sprite);this.mask(group.mix,gate,false,group);sprite=group.mix;}
      ctx.drawImage(sprite,group.x*this.rx,group.y*this.ry,group.width*this.rx,group.height*this.ry);
    }
    ctx.save();ctx.scale(this.rx,this.ry);
    for(const s of samples){if(s.radial&&s.ring>0)this.ring(s.origin.x,s.origin.y,s.radius,s.ring,s.target!==false);if(s.echo)this.ring(s.origin.x,s.origin.y,s.echo.radius,s.echo.alpha);}
    ctx.restore();
  }
  ring(x,y,r,alpha,on=true){
    if(r<=0)return;const ctx=this.ctx;
    const g=ctx.createRadialGradient(x,y,Math.max(0,r-(on?180:112)),x,y,r);
    if(on)for(let i=0;i<=12;i++){const t=i/12,d=(1-t)*Math.min(r,180),u=Math.min(1,d/180),edge=Math.min(1,d/4),a=(1-u*u*(3-2*u))*edge*edge*(3-2*edge)*alpha*.8;g.addColorStop(t,`rgba(255,255,255,${a})`);}
    else {g.addColorStop(0,'#0000');g.addColorStop(.62,`rgba(0,0,0,${alpha*.055})`);g.addColorStop(.95,`rgba(0,0,0,${alpha*.18})`);g.addColorStop(1,'#0000');}
    ctx.fillStyle=g;ctx.fillRect(0,0,this.width,this.height);
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.lineWidth=1;ctx.strokeStyle=`rgba(245,241,230,${alpha})`;ctx.stroke();
  }
  destroy(){for(const c of this.buffers)c.width=c.height=1;this.buffers=[];this.canvas.width=this.canvas.height=1;this.canvas.remove();this.art=null;}
}

export class SceneRenderer{
  static async prepareAssets(images,signal){
    const art=new PreparedArtwork(images),tasks=[];
    for(const sight of [true,false])for(const touch of [true,false])tasks.push(()=>art.surface({sight,touch}));
    tasks.push(()=>art.object({sight:true},'smell'));
    for(const sight of [true,false]){
      for(const sense of ['sound','candle'])tasks.push(()=>art.object({sight},sense));
      for(const taste of [true,false])tasks.push(()=>art.object({sight,taste},'taste'));
    }
    try{for(const task of tasks){if(signal.aborted)throw new DOMException('Closed','AbortError');task();await new Promise(resolve=>setTimeout(resolve,0));}
      if(signal.aborted)throw new DOMException('Closed','AbortError');art.images=null;return art;
    }catch(error){art.destroy();throw error;}
  }
  constructor(stage,images,report,artwork){
    const started=performance.now();this.stage=stage;this.report=report;this.artwork=artwork;this.layers=[];this.photos=[];this.requests=new Map();this.field=new RippleField();this.frame=0;this.timer=0;this.disposed=false;
    this.profile=new URLSearchParams(location.search).get('senses-profile')==='1';this.frameTimes=[];this.lastFrame=0;
    this.tick=now=>{if(this.profile&&this.lastFrame){this.frameTimes.push(now-this.lastFrame);if(this.frameTimes.length>600)this.frameTimes.shift();}this.lastFrame=now;this.frame=0;this.draw(now);this.schedule();};this.rings=[];this.scope=new AbortController();this.stats={draws:0,maxCPU:0};
    try{if(new URLSearchParams(location.search).get('senses-renderer')==='css')throw new Error('CSS review mode');
      this.gpu=new GPUComposite(artwork);stage.append(this.gpu.canvas);stage.dataset.renderer='gpu-independent-ripples';
      this.gpu.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(this.disposed)return;const failed=this.gpu;this.gpu=null;failed?.destroy();stage.dataset.gpuFallback='Context lost';event.target.remove();this.makeFallback();this.resize(true);this.draw(performance.now());},{signal:this.scope.signal});
    }catch(error){stage.dataset.gpuFallback=error.message;this.makeFallback();}
    this.makeAmbient();this.resize(true);report({builds:1,buildMs:Math.round(performance.now()-started)});
  }
  layer(parent=this.stage,gates=[],add=false){
    const node=document.createElement('div');node.className='tdb-senses-layer'+(add?' tdb-senses-add':'');parent.append(node);this.layers.push({node,gates,last:''});return node;
  }
  photograph(parent,canvas,bounds=null){
    const photo=document.createElement('div');photo.className='tdb-senses-photo';
    if(bounds){const [x,y,width,height]=bounds;Object.assign(canvas.style,{position:'absolute',left:`${x/PHOTO_WIDTH*100}%`,top:`${y/PHOTO_HEIGHT*100}%`,width:`${width/PHOTO_WIDTH*100}%`,height:`${height/PHOTO_HEIGHT*100}%`});}
    else canvas.className='tdb-senses-photo-image';
    photo.append(canvas);parent.append(photo);this.photos.push(photo);return photo;
  }
  makeFallback(){
    this.stage.dataset.renderer='canvas-independent-ripples';
    this.raster=new RasterComposite(this.artwork);this.stage.prepend(this.raster.canvas);
  }
  makeAmbient(){
    // These nodes remain connected: changing another sense never resets their drift.
    for(const touch of [false,true]){
      const g=this.artwork.surface({sight:false,touch}).glare;g.canvas.className='tdb-senses-chair-glare';
      this.photograph(this.layer(this.stage,[[0,true],[3,!touch]]),g.canvas,[g.x,g.y,g.width,g.height]);
    }
    for(const fresh of [false,true]){
      const layer=this.layer(this.stage,[[2,!fresh]]),photo=document.createElement('div');photo.className='tdb-senses-photo';this.photos.push(photo);layer.append(photo);
      const air=document.createElement('div');air.className=`tdb-senses-motes ${fresh?'tdb-senses-botanicals':'tdb-senses-dust'}`;
      if(fresh){
        const blossom=`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor">${[0,72,144,216,288].map(a=>`<ellipse cx="12" cy="7.4" rx="3.1" ry="4.4" transform="rotate(${a} 12 12)"/>`).join('')}</g><circle cx="12" cy="12" r="2.3" fill="#cbbb7c"/></svg>`;
        const leaves='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21Q9 13 14 4" fill="none" stroke="#91a578" stroke-width="1"/><path d="M12 14Q3 14 5 7Q12 7 12 14M12 11Q13 3 20 3Q20 10 12 11" fill="#91a578"/></svg>';
        const spots=[[24,30],[30,42],[34,34],[21,47],[38,25],[29,53],[40,17],[36,20],[23,38]];
        air.innerHTML=spots.map(([x,y],i)=>`<i class="${i===3||i===7?'sprig':'blossom'}" style="left:${x}%;top:${y}%;--mote-size:${13+i%3*2}px;--mote-colour:${i%3===0?'#e9d5d3':'#f1e9d5'};animation-delay:${-i*3.8}s;animation-duration:${20+i*1.4}s">${i===3||i===7?leaves:blossom}</i>`).join('');
      }else{
        const haze=document.createElement('div');haze.className='tdb-senses-haze';photo.append(haze);
        air.innerHTML=Array.from({length:26},(_,i)=>`<i class="spore" style="left:${18+(i*19.7)%68}%;top:${17+(i*13.3)%60}%;--mote-size:${2+i%4}px;--mote-alpha:${.14+i%4*.06};animation-delay:${-i*2.7}s;animation-duration:${24+i%7*2}s"></i>`).join('');
      }
      photo.append(air);
    }
  }
  resize(force=false){
    const {width,height}=this.stage.getBoundingClientRect();if(!width||!height||!force&&width===this.width&&height===this.height)return;
    this.width=width;this.height=height;this.photo=coverGeometry(width,height);const r=this.photo;
    this.photos.forEach(photo=>Object.assign(photo.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'}));
    this.gpu?.resize(width,height,r);this.raster?.resize(width,height,r);this.stage.dataset.photoRect=JSON.stringify(r);this.finish();
  }
  render(state){
    this.cancel();this.field=new RippleField(state);this.draw(performance.now());
  }
  reveal(state,origin,{sense,duration,reduced=false,doublePulse=false,onProgress}){
    const now=performance.now();const prior=this.requests.get(sense);if(prior){prior.resolve(false);this.requests.delete(sense);}
    const wave=this.field.start(sense,!!state[sense],origin,revealRadius(this.width,this.height,origin),now,{duration,reduced,doublePulse});
    const promise=new Promise(resolve=>this.requests.set(sense,{wave,resolve,onProgress}));
    this.stage.dataset.peakRipples=String(Math.max(Number(this.stage.dataset.peakRipples||0),this.requests.size));
    this.draw(now);this.schedule();return promise;
  }
  draw(now){
    if(this.disposed)return;const started=performance.now();
    for(const [sense,request] of this.requests)if(now>=request.wave.start+request.wave.delay+request.wave.duration){this.field.settle(sense);this.requests.delete(sense);request.onProgress?.(1);request.resolve(true);}
    const samples=this.field.samples(now);this.gpu?.draw(samples);this.raster?.draw(samples);
    for(const [sense,request] of this.requests){const sample=samples[RIPPLE_SENSES.indexOf(sense)];request.onProgress?.(sample.progress,sample);}
    for(const layer of this.layers){const style=gateStyle(samples,layer.gates),key=style.visibility+style.opacity+style.maskImage;if(key!==layer.last){Object.assign(layer.node.style,style);layer.node.dataset.ambientHidden=String(style.visibility==='hidden');layer.last=key;}}
    if(this.rings.length){
      const circles=samples.filter(s=>s.radial&&s.ring>0).map(s=>({x:s.origin.x,y:s.origin.y,r:s.radius,alpha:s.ring}));
      const sound=samples[1];if(sound.echo)circles.push({x:sound.origin.x,y:sound.origin.y,r:sound.echo.radius,alpha:sound.echo.alpha});
      this.rings.forEach((ring,i)=>{const c=circles[i];ring.hidden=!c;if(c)Object.assign(ring.style,{left:c.x+'px',top:c.y+'px',width:Math.max(0,c.r*2)+'px',height:Math.max(0,c.r*2)+'px',opacity:String(c.alpha)});});
    }
    this.stats.draws++;this.stats.maxCPU=Math.max(this.stats.maxCPU,performance.now()-started);
    if(this.lastActive!==this.requests.size){this.lastActive=this.requests.size;this.stage.dataset.activeRipples=String(this.lastActive);}
    if(!this.requests.size){this.stopScheduling();this.stage.dataset.renderState='idle';this.stage.dataset.draws=String(this.stats.draws);this.stage.dataset.maxSubmitMs=this.stats.maxCPU.toFixed(2);if(this.profile&&this.frameTimes.length){const times=[...this.frameTimes].sort((a,b)=>a-b);this.stage.dataset.frameProfile=JSON.stringify({samples:times.length,medianMs:+times[Math.floor(times.length*.5)].toFixed(2),p95Ms:+times[Math.floor(times.length*.95)].toFixed(2),over34ms:times.filter(t=>t>34).length});}}
  }
  schedule(){
    if(this.disposed||!this.requests.size)return;if(this.stage.dataset.renderState!=='animating')this.stage.dataset.renderState='animating';
    if(!this.frame)this.frame=requestAnimationFrame(this.tick);
    let end=Infinity;for(const r of this.requests.values())end=Math.min(end,r.wave.start+r.wave.delay+r.wave.duration);
    if(this.deadline!==end||!this.timer){clearTimeout(this.timer);this.deadline=end;
      this.timer=setTimeout(()=>{this.timer=0;this.deadline=0;this.draw(performance.now());this.schedule();},Math.max(16,end-performance.now()+40));}
  }
  stopScheduling(){this.lastFrame=0;cancelAnimationFrame(this.frame);clearTimeout(this.timer);this.frame=0;this.timer=0;this.deadline=0;}
  cancel(){this.stopScheduling();for(const r of this.requests.values())r.resolve(false);this.requests.clear();this.field.waves.clear();}
  finish(){for(const sense of [...this.requests.keys()]){this.field.settle(sense);const r=this.requests.get(sense);this.requests.delete(sense);r.onProgress?.(1);r.resolve(true);}this.stopScheduling();if(this.width)this.draw(performance.now());}
  motion(paused){this.stage.classList.toggle('tdb-senses-motion-paused',paused);}
  destroy(){if(this.disposed)return;this.disposed=true;this.cancel();this.scope.abort();this.gpu?.destroy();this.raster?.destroy();this.stage.replaceChildren();this.artwork.destroy();this.layers=[];this.photos=[];}
}


/* TDB Five Senses v0.24.1 — Surgery photographic proof of concept.
 * One registered scene, real old/new photographic circular masking.
 * No IX2, Swiper, analytics, persistence, or document-wide discovery loops.
 */
const DURATION = 1200;
const OFF_DURATION = 800;
const SENSES = ['sight', 'sound', 'smell', 'touch', 'taste'];
const LABELS = ['Sight', 'Sound', 'Smell', 'Touch', 'Taste'];
const DETAILS={
 all:['Everything works, but the feeling is distinctly clinical. Harsh light, hard edges, busy sounds and familiar smells can bring back memories of uncomfortable or hurried visits. Function alone does not always help you feel at ease. That is the experience we wanted to move beyond, considering how the whole environment feels, as well as how it works.','Every sense plays its part. Warm light, gentle sound, fresh air, soft textures and thoughtful hospitality work in harmony to complete the picture. One or two considered touches can make a difference, but leave a sense out and something feels missing. At The Dental Barns, all five come together to create a place where you can feel truly at ease.'],
 sight:['Cool overhead lighting, hard shadows and clinical finishes. Bright reflections draw attention to equipment and surfaces, giving the room the familiar feel of a conventional surgery.','Warm, professionally designed lighting brings a softer feel to the room, without the glare. A complementary palette of gentle colours and natural finishes makes every detail feel considered, creating a space that feels welcoming from the moment you settle in.'],
 sound:['The bustle of the high street, conversations and dental equipment form a busy backdrop. Even before treatment begins, those familiar sounds can make it difficult to switch off.','Noise-cancelling headphones help the busy world fall away. Gentle birdsong and soothing piano set an unhurried pace, while treatment rooms set apart from dental equipment offer a quieter place to settle. From the sound around you to the music you choose, each detail helps you feel more at ease.'],
 smell:['The familiar scent of cleaning agents and still, enclosed air. It is a small part of the surroundings, but one that can make a room feel distinctly clinical.','Fresh outdoor air is filtered and brought into the surgery through our heat-exchange ventilation, with our signature scent adding a subtle finishing touch. It is a quietly considered part of the environment, keeping the atmosphere fresh, gentle and welcoming throughout your visit.'],
 touch:['Clinical surfaces and hard edges put function first. From the chair beneath you to the finishes around it, there is little of the softness and texture you would choose at home.','Settle into a plush, softly upholstered treatment chair, surrounded by textured wood and finishes chosen for their warmth. From the surfaces you touch to the chair that supports you, each detail brings a familiar sense of home into your time with us.'],
 taste:['Nothing beyond the usual tastes of dentistry. The visit centres on treatment, with few of the small gestures of hospitality that invite you to pause and feel at home.','A coffee, a macaron and a moment to yourself. Our hospitality is part of the experience, with complimentary Aesop hand wash and mouth rinse among the thoughtful finishing touches. Small details, chosen to make your visit feel personal and a little more like home.']
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

export class SenseTransitions {
  constructor(initial){this.visible={...initial};this.target={...initial};this.active=new Map();}
  request(state,origin,intro=false,sense){
    const request={from:{...this.target},state:{...state},origin,intro,sense};
    this.target={...state};this.active.set(sense,request);return request;
  }
  finish(request){
    if(this.active.get(request.sense)!==request)return false;
    this.visible[request.sense]=request.state[request.sense];this.active.delete(request.sense);return true;
  }
  cancel(){this.active.clear();}
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

export class Soundscape {
  constructor(base, signal, report) {
    this.base = base; this.signal = signal; this.report = report;
    this.context = null; this.sources = []; this.gains = []; this.generation = 0;
    this.ready = false; this.requested = null; this.bytes = null; this.master = null; this.muted = false;
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
    // Classify deliberate music playback where Audio Session is supported.
    try {
      const session = navigator.audioSession;
      if (session) { this.audioSession = session; this.previousSessionType = session.type; session.type = 'playback'; }
    } catch (_) {}
    this.context = new AudioContextType();
    const context = this.context;
    this.master = context.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(context.destination);
    // Connect and start during the gesture, before downloading or decoding.
    const prime = context.createBufferSource();
    prime.buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    prime.loop = true; prime.connect(this.master); prime.start(); this.prime = prime;
    const resumed = context.resume();
    this.report('preparing');
    let timer, abort;
    const cancelled = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Audio start timed out')), 20000);
      abort = () => reject(new DOMException('Audio start cancelled', 'AbortError'));
      this.signal.addEventListener('abort', abort, {once:true});
      if (this.signal.aborted) abort();
    });
    let decoded;
    try {
      [, decoded] = await Promise.race([
        Promise.all([resumed, this.prefetch().then(bytes => Promise.all(bytes.map(buffer => context.decodeAudioData(buffer.slice(0)))))]),
        cancelled
      ]);
    } finally {
      clearTimeout(timer); this.signal.removeEventListener('abort', abort);
      try { prime.stop(); prime.disconnect(); } catch (_) {}
      if (this.prime === prime) this.prime = null;
    }
    if (generation !== this.generation || this.signal.aborted || context.state !== 'running') {
      try { await context.close(); } catch (_) {}
      throw new DOMException('Audio start cancelled', 'AbortError');
    }
    decoded.forEach(buffer => {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer; source.loop = true; gain.gain.value = 0;
      source.connect(gain); gain.connect(this.master); source.start();
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
    if (on) {
      if(intro){clinical.setValueAtTime(0,t);}
      clinical.linearRampToValueAtTime(0,t+(intro?.15:.35));
      // Normal Sound ON: silence the first pulse, then start calm with the second at 600ms.
      const calmDelay=intro?.175:.6;
      calm.setValueAtTime(0,t);calm.setValueAtTime(0,t+calmDelay);
      calm.linearRampToValueAtTime(.85,t+calmDelay+.6);
    } else {
      clinical.linearRampToValueAtTime(.65,t+.12);calm.linearRampToValueAtTime(0,t+.12);
    }
  }
  setMuted(muted) {
    this.muted = muted;
    if (!this.master || !this.context) return;
    const gain=this.master.gain,t=this.context.currentTime;
    gain.cancelScheduledValues(t);gain.setValueAtTime(gain.value,t);
    gain.linearRampToValueAtTime(muted?0:1,t+.04);
  }
  stop() {
    this.generation++; this.ready = false;
    try { this.prime?.stop(); this.prime?.disconnect(); } catch (_) {}
    this.prime = null;
    try { if (this.audioSession?.type === 'playback') this.audioSession.type = this.previousSessionType; } catch (_) {}
    this.audioSession = null;
    this.gains.forEach(g => { try { g.gain.cancelScheduledValues(0); g.gain.value = 0; g.disconnect(); } catch (_) {} });
    this.sources.forEach(s => { try { s.stop(); s.disconnect(); } catch (_) {} });
    this.sources = []; this.gains = [];
    this.master?.disconnect(); this.master=null;
    const context = this.context; this.context = null;
    if (context) context.close().catch(() => {});
    this.report('stopped');
  }
}

export async function mountExperience({dialog,signal,assetBase,onClose,loadingCover=null,closeControl=null}) {
  let disposed=false,renderer=null,audio=null,audioReady=false,audioPending=false,motionPaused=false,hasBegun=false,interactionReady=false,muted=false,soundOnPending=false;
  // Staging review: full motion explicitly requested.
  const reduced={matches:false,addEventListener(){}};
  const initial={sight:true,sound:false,smell:true,touch:true,taste:true};
  const requested={...initial},queue=new SenseTransitions(initial),scope=new AbortController();
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
  Object.values(images).forEach(image=>image.close?.());
  dialog.classList.add('tdb-senses');dialog.dataset.audioState='uninitiated';dialog.dataset.scene='surgery';dialog.dataset.phase='ready';dialog.dataset.version='0.24.1';
  dialog.innerHTML=`<div class="tdb-senses-stage" aria-hidden="true"></div><div class="tdb-senses-shade" aria-hidden="true"></div>
    <header class="tdb-senses-top"><div class="tdb-senses-room">Surgery<span aria-hidden="true"></span></div><div class="tdb-senses-utilities"><span class="tdb-senses-waveform" data-mode="silent" aria-hidden="true"><svg viewBox="0 0 44 24" fill="none" stroke="currentColor" stroke-width="1">${[5,9,15,19,13,21,16,11,18,9,5].map((h,i)=>`<path d="M${2+i*4} ${12-h/2}v${h}" style="--wave-delay:${-i*.19}s;--wave-duration:${2.8+i%3*.35}s;--road-duration:${.21+i%4*.035}s"/>`).join('')}</svg></span>
    <button type="button" class="tdb-senses-motion" aria-label="Turn Sound on" aria-pressed="false">${svg('<path d="M12 9v14M20 9v14"/>')}</button>
    <button type="button" class="tdb-senses-close" aria-label="Close experience">${svg('<path d="m9 9 14 14M23 9 9 23"/>')}</button></div></header>
    <h2 id="tdb-senses-title" class="tdb-senses-title">Every sense,<br>considered.</h2>
    <div class="tdb-senses-detail" hidden><p class="tdb-senses-detail-name"></p><p class="tdb-senses-detail-state"></p><p class="tdb-senses-detail-copy"></p></div>
    <p id="tdb-senses-description" class="tdb-senses-sr">Explore the Surgery. Each control switches one considered detail on or off. Sound starts only when you activate Start. Sound off plays the conventional soundscape. The top speaker mutes or unmutes all audio without changing the scene. Close stops all audio. Escape closes the experience.</p>
    <div class="tdb-senses-intro-blur" aria-hidden="true"></div>
    <button type="button" class="tdb-senses-start" aria-label="Start experience with sound"><span class="tdb-senses-circle">${svg('<path d="M5 12h5l7-6v20l-7-6H5Z M21 11q5 5 0 10 M24 7q9 9 0 18"/>')}</span><span class="tdb-senses-start-label">START</span></button>
    <div class="tdb-senses-all" role="group" aria-label="Set all senses"><button type="button" data-all="on">All on</button><span aria-hidden="true"></span><button type="button" data-all="off">All off</button></div>
    <div class="tdb-senses-controls" role="group" aria-label="Five senses">${SENSES.map((sense,i)=>`<button type="button" class="tdb-senses-control" data-sense="${sense}" aria-label="${sense==='sound'?'Begin sound experience':LABELS[i]}" aria-pressed="${initial[sense]}"><span class="tdb-senses-circle">${svg(ICONS[i])}</span><span class="tdb-senses-name">${LABELS[i]}</span><span class="tdb-senses-value">${sense==='sound'?'':initial[sense]?'ON':'OFF'}</span></button>`).join('')}</div>
    <p class="tdb-senses-message" aria-live="polite"></p><p class="tdb-senses-sr tdb-senses-announcement" aria-live="polite"></p>`;
  // Carry the loading cover and close control across the DOM handover.
  if(loadingCover)dialog.append(loadingCover);
  if(closeControl){
    const duplicate=dialog.querySelector('.tdb-senses-close');
    duplicate.style.visibility='hidden';duplicate.tabIndex=-1;duplicate.setAttribute('aria-hidden','true');
    dialog.append(closeControl);
  }
  dialog.setAttribute('aria-labelledby','tdb-senses-title');dialog.setAttribute('aria-describedby','tdb-senses-description');
  const controls=Array.from(dialog.querySelectorAll('[data-sense]'));
  const allButtons=Array.from(dialog.querySelectorAll('[data-all]'));
  let allTimer=0,allTarget=null;
  function cancelAll(){clearTimeout(allTimer);allTimer=0;allTarget=null;}
  function finishAll(){
    if(allTarget===null||allTimer||queue.active.size||disposed)return;
    const on=allTarget;if(!SENSES.every(sense=>requested[sense]===on))return;
    allTarget=null;void showDetail('all',on);
    announcement.textContent=on?'All senses on.':'All senses off.';
  }
  function setAll(on){
    cancelAll();if(!interactionReady||disposed)return;
    allTarget=on;void fadeDetailOut();
    const order=on?[...SENSES.filter(sense=>sense!=='sound'),'sound']:SENSES;
    const remaining=order.filter(sense=>requested[sense]!==on);
    const step=()=>{
      allTimer=0;if(disposed||signal.aborted||!interactionReady)return;
      let sense;
      while(remaining.length){const next=remaining.shift();if(requested[next]!==on){sense=next;break;}}
      if(!sense){finishAll();return;}
      requested[sense]=on;activate(sense,controls[SENSES.indexOf(sense)],false,true);
      if(remaining.length)allTimer=setTimeout(step,reduced.matches?0:540);
    };
    step();
  }
  const announcement=dialog.querySelector('.tdb-senses-announcement'),message=dialog.querySelector('.tdb-senses-message'),motion=dialog.querySelector('.tdb-senses-motion');
  const stage=dialog.querySelector('.tdb-senses-stage'),startButton=dialog.querySelector('.tdb-senses-start');
  renderer=new SceneRenderer(stage,images,stats=>{dialog.dataset.sceneBuilds=String(stats.builds);dialog.dataset.lastBuildMs=String(stats.buildMs);},artwork);
  renderer.render(initial);
  const introBlur=dialog.querySelector('.tdb-senses-intro-blur');
  function resetIntroBlur(){introBlur.hidden=false;introBlur.style.cssText='';}
  function revealIntroBlur(p,sample){
    if(p>=1){introBlur.hidden=true;return;}
    if(!sample?.radial){introBlur.style.opacity=String(1-p);return;}
    const mask=`radial-gradient(circle at ${sample.origin.x}px ${sample.origin.y}px,transparent ${Math.max(0,sample.radius-2)}px,#000 ${Math.max(0,sample.radius+2)}px)`;
    introBlur.style.maskImage=mask;introBlur.style.webkitMaskImage=mask;
  }
  const createAudio=()=>new Soundscape(assetBase,signal,state=>{dialog.dataset.audioState=state;});
  audio=createAudio();audio.prefetch().catch(()=>{});

  function updateControls(){
    dialog.classList.toggle('tdb-senses-interactive',interactionReady);
    allButtons.forEach(button=>{
      const on=button.dataset.all==='on';
      button.disabled=!interactionReady||(allTarget!==null?allTarget===on:SENSES.every(sense=>requested[sense]===on));
    });
    controls.forEach((button,i)=>{
      button.disabled=!interactionReady;
      const sense=SENSES[i];
      const settlingOff=!requested[sense]&&(queue.target[sense]!==requested[sense]||queue.active.has(sense));
      const value=sense==='sound'&&soundOnPending?false:settlingOff?button.dataset.state==='on':!!requested[sense];
      button.setAttribute('aria-pressed',String(value));
      button.dataset.state=sense==='sound'&&!audioReady?'pending':value?'on':'off';
      button.querySelector('.tdb-senses-value').textContent=value?'ON':'OFF';
      if(sense==='sound'){button.setAttribute('aria-label',audioReady?'Sound':'Begin sound experience');button.setAttribute('aria-busy',String(audioPending));}
    });
    startButton.hidden=hasBegun;startButton.disabled=audioPending;startButton.setAttribute('aria-busy',String(audioPending));
    startButton.querySelector('.tdb-senses-start-label').textContent=audioPending?'STARTING…':'START';
    dialog.classList.toggle('tdb-senses-awaiting-sound',!audioReady);dialog.classList.toggle('tdb-senses-has-begun',hasBegun);
    motion.hidden=false;motion.disabled=!interactionReady;
    dialog.querySelector('.tdb-senses-waveform').dataset.mode=!audioReady?'silent':soundOnPending?'quiet':requested.sound?'calm':'road';
    const soundLit=audioReady&&!muted;
    motion.setAttribute('aria-pressed',String(muted));motion.setAttribute('aria-label',muted?'Unmute audio':'Mute audio');
    if(motion.dataset.audible!==String(soundLit)){motion.dataset.audible=String(soundLit);motion.innerHTML=svg('<path d="M5 12h5l7-6v20l-7-6H5Z"/>'+(soundLit?'<path d="M21 11q5 5 0 10M24 7q9 9 0 18"/>':'<path d="m22 12 8 8m0-8-8 8"/>'));}
    renderer.motion(motionPaused||reduced.matches||document.hidden);
  }
  function begin(active){
    if(!active||disposed)return;
    const reverse=isReverseTransition(active);
    const duration=reduced.matches?180:reverse?OFF_DURATION:DURATION;
    dialog.dataset.transitionDirection=reverse?'contract':'expand';
    dialog.dataset.phase='transition';dialog.dataset.transitionProgress='0';dialog.dataset.transitionStarted=String(Math.round(performance.now()));
    if(audioReady&&(active.intro||active.from.sound!==active.state.sound))audio.transition(active.state.sound,active.intro);
    const started=performance.now();
    renderer.reveal(active.state,active.origin,{sense:active.sense,duration,reverse,doublePulse:!active.intro&&!reverse&&active.state.sound&&!active.from.sound,reduced:reduced.matches,onProgress:(p,sample)=>{if(active.intro)revealIntroBlur(p,sample);if(active.sense==='sound'&&soundOnPending&&(p>=1||sample?.elapsed>=600)){soundOnPending=false;updateControls();}}}).then(complete=>{
      if(!complete||disposed||signal.aborted||queue.active.get(active.sense)!==active)return;
      dialog.dataset.lastTransitionMs=String(Math.round(performance.now()-started));
      queue.finish(active);dialog.dataset.phase=queue.active.size?'transition':'ready';dialog.dataset.transitionProgress='1';
      dialog.dataset.visibleState=JSON.stringify(queue.visible);updateControls();
      if(active.intro){interactionReady=true;updateControls();controls[1].focus({preventScroll:true});}
      finishAll();
    });
  }
  const detail=dialog.querySelector('.tdb-senses-detail');
  let detailAnimation=null,detailRevision=0;
  function hideDetail(){
    ++detailRevision;detailAnimation?.cancel();detailAnimation=null;detail.hidden=true;
  }
  async function fadeDetailOut(){
    if(detail.hidden||reduced.matches){hideDetail();return;}
    const revision=++detailRevision,opacity=Number(getComputedStyle(detail).opacity);
    detailAnimation?.cancel();
    detailAnimation=detail.animate([{opacity},{opacity:0}],{duration:180,easing:'ease-in-out',fill:'forwards'});
    try{await detailAnimation.finished;}catch{return;}
    if(revision===detailRevision){detail.hidden=true;detailAnimation.cancel();detailAnimation=null;}
  }
  async function showDetail(sense,on){
    const revision=++detailRevision;
    const opacity=detail.hidden?0:Number(getComputedStyle(detail).opacity);
    detailAnimation?.cancel();detailAnimation=null;
    const fade=async(from,to,duration,delay=0)=>{
      detailAnimation=detail.animate([{opacity:from},{opacity:to}],{duration,delay,easing:'ease-in-out',fill:'both'});
      try{await detailAnimation.finished;return revision===detailRevision&&!disposed&&!signal.aborted;}
      catch{return false;}
    };
    if(!reduced.matches&&opacity>0&&!await fade(opacity,0,180))return;
    if(revision!==detailRevision||disposed||signal.aborted)return;
    detail.querySelector('.tdb-senses-detail-name').textContent=sense==='all'?'Every sense, considered.':LABELS[SENSES.indexOf(sense)];
    detail.querySelector('.tdb-senses-detail-state').textContent=on?'After':'Before';
    detail.querySelector('.tdb-senses-detail-copy').textContent=DETAILS[sense][Number(on)];
    detail.hidden=false;
    if(!reduced.matches&&!await fade(0,1,380,opacity>0?220:0))return;
    detailAnimation?.cancel();detailAnimation=null;
  }
  function activate(sense,button,intro=false,batch=false){
    const rect=(button.querySelector('.tdb-senses-circle')||button).getBoundingClientRect(),bounds=stage.getBoundingClientRect();
    const origin={x:rect.left+rect.width/2-bounds.left,y:rect.top+rect.height/2-bounds.top,radius:Math.min(rect.width,rect.height)/2};
    if(intro)hideDetail();else if(!batch)void showDetail(sense,requested[sense]);
    if(sense==='sound')soundOnPending=!!requested.sound&&!intro&&!reduced.matches;
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
  allButtons.forEach(button=>listen(button,'click',()=>setAll(button.dataset.all==='on')));
  controls.forEach((button,i)=>listen(button,'click',()=>{
    if(!interactionReady)return;
    cancelAll();const sense=SENSES[i];message.textContent='';
    requested[sense]=!requested[sense];activate(sense,button);
  }));
  listen(dialog.querySelector('.tdb-senses-close'),'click',onClose);
  listen(motion,'click',()=>{if(!interactionReady)return;muted=!muted;audio.setMuted(muted);updateControls();});
  listen(dialog,'keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!event.target.closest('[data-sense]'))return;
    event.preventDefault();const current=controls.indexOf(event.target.closest('[data-sense]'));
    controls[event.key==='Home'?0:event.key==='End'?4:(current+(event.key==='ArrowRight'?1:4))%5].focus();
  });
  const resize=new ResizeObserver(()=>{if(!disposed)renderer.resize();});resize.observe(stage);
  listen(reduced,'change',()=>{renderer.finish();updateControls();});
  listen(document,'visibilitychange',()=>{
    if(document.hidden){
      cancelAll();audio.stop();audio=createAudio();audioReady=false;audioPending=false;requested.sound=false;hasBegun=false;interactionReady=false;muted=false;soundOnPending=false;hideDetail();resetIntroBlur();
      queue.cancel();queue.visible={...requested};queue.target={...requested};renderer.render(requested);dialog.dataset.audioState='uninitiated';dialog.dataset.phase='ready';dialog.dataset.transitionProgress='1';
    }
    updateControls();
  });
  const cleanup=()=>{
    if(disposed)return;disposed=true;cancelAll();hideDetail();queue.cancel();audio.stop();scope.abort();resize.disconnect();renderer.destroy();Object.values(images).forEach(image=>image.close?.());
  };
  signal.addEventListener('abort',cleanup,{once:true});
  dialog.dataset.visibleState=JSON.stringify(initial);updateControls();
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(signal.aborted){cleanup();return;}
  dialog.classList.add('tdb-senses-ready');startButton.focus({preventScroll:true});return{cleanup};
}

