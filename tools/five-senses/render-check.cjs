// Optional native raster verification; requires @napi-rs/canvas and local photo assets.
const fs=require('fs'),path=require('path');
const {createCanvas,loadImage,Path2D}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas'):'@napi-rs/canvas');
(async()=>{
 global.Path2D=Path2D;global.window={devicePixelRatio:1};global.document={createElement:()=>{const c=createCanvas(1,1);c.setAttribute=()=>{};c.remove=()=>{};c.dataset={};c.style={};return c;}};
 const root=path.resolve(__dirname,'../..')+'/';
 const src=fs.readFileSync(root+'src/five-senses/scene-renderer.js','utf8')+'\nexport {makeSurface,objectLayer};';
 const {SceneRenderer,RasterComposite,RippleField,makeSurface,objectLayer,coverGeometry}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 const assetRoot=(process.env.TDB_SENSES_ASSETS||root+'assets/five-senses')+'/';
 const images={};for(const key of ['warm','clinical','objects'])images[key]=await loadImage(assetRoot+'surgery-'+key+'.webp');
 images.candle=await loadImage(assetRoot+'scent-candle-v3.webp');images.tasteClinical=await loadImage(assetRoot+'taste-clinical-v3.webp');
 const art=await SceneRenderer.prepareAssets(images,new AbortController().signal),raster=new RasterComposite(art);raster.resize(1086,1448,coverGeometry(1086,1448));
 const names=['sight','sound','smell','touch','taste'];let worst=0;
 for(let bits=0;bits<32;bits++){
  const state=Object.fromEntries(names.map((k,i)=>[k,!!(bits>>i&1)])),c=makeSurface(images,state);
  for(const sense of ['smell','sound','taste','candle'])if(sense==='taste'||(sense==='candle'?state.smell:state[sense]))c.getContext('2d').drawImage(objectLayer(images,state,sense),0,0);
  raster.draw(new RippleField(state).samples(0));
  const expected=c.getContext('2d').getImageData(0,0,1086,1448).data,actual=raster.ctx.getImageData(0,0,1086,1448).data;let total=0,max=0;
  for(let i=0;i<actual.length;i++){const d=Math.abs(actual[i]-expected[i]);total+=d;max=Math.max(max,d);}const mean=total/actual.length;worst=Math.max(worst,mean);if(mean>.15||max>12)throw Error(JSON.stringify({bits,mean,max}));
 }
 if(raster.canvas.width!==1086||raster.canvas.height!==1448)throw Error('Settled output must restore full detail');
 console.log('All 32 fallback photograph states preserved; maximum mean channel difference',worst);
 raster.resize(390,844,coverGeometry(390,844));const field=new RippleField(Object.fromEntries(names.map(k=>[k,true])));
 for(const [i,k] of names.entries())field.start(k,false,{x:40+i*75,y:750,radius:25},900,i*40,{duration:800});
 // Compare simultaneous independent masks at points away from feather boundaries.
 const probeSamples=field.samples(370).map(s=>({...s,ring:0,echo:null}));raster.draw(probeSamples);
 if(raster.canvas.width*raster.canvas.height>186000)throw Error('Motion buffer budget exceeded');
 const probe=raster.ctx.getImageData(0,0,raster.canvas.width,raster.canvas.height).data;
 for(const [vx,vy] of [[50,100],[140,230],[260,400],[60,600],[300,700]]){
  const ix=Math.floor(vx*raster.rx),iy=Math.floor(vy*raster.ry),x=(ix+.5)/raster.rx,y=(iy+.5)/raster.ry;
  if(probeSamples.some(s=>Math.abs(Math.hypot(x-s.origin.x,y-s.origin.y)-s.radius)<16))continue;
  const state=Object.fromEntries(names.map((k,i)=>[k,Math.hypot(x-probeSamples[i].origin.x,y-probeSamples[i].origin.y)<probeSamples[i].radius]));
  const expected=makeSurface(images,state);
  for(const sense of ['smell','sound','taste','candle'])if(sense==='taste'||(sense==='candle'?state.smell:state[sense]))expected.getContext('2d').drawImage(objectLayer(images,state,sense),0,0);
  const reference=createCanvas(raster.canvas.width,raster.canvas.height),r=raster.photo;
  reference.getContext('2d').drawImage(expected,r.x*raster.rx,r.y*raster.ry,r.width*raster.rx,r.height*raster.ry);
  const pixel=reference.getContext('2d').getImageData(ix,iy,1,1).data,at=(iy*raster.canvas.width+ix)*4;
  for(let c=0;c<3;c++)if(Math.abs(probe[at+c]-pixel[c])>5)throw Error('Concurrent mask selected the wrong photographic state');
 }
 console.log('Concurrent masks preserve their own states in the bounded motion surface.');
 let timings=[];for(let pass=0;pass<4;pass++)for(let t=180;t<790;t+=16.67){let start=performance.now();raster.draw(field.samples(t));timings.push(performance.now()-start);}timings.sort((a,b)=>a-b);
 console.log('Native Canvas CPU benchmark, 390x844, five concurrent masks (not browser FPS)',{median:timings[Math.floor(timings.length*.5)],p95:timings[Math.floor(timings.length*.95)]});
 raster.destroy();art.destroy();
})();
