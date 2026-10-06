const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'../dist/tdb-motion.js'),'utf8');
function setup(reduced=false){let id=0,now=0;const frames=new Map(),listeners={},media={matches:reduced,addEventListener:(e,f)=>listeners.media=f},node={style:{opacity:''},top:500,getBoundingClientRect(){return{top:this.top}}};const window={addEventListener:(e,f)=>listeners[e]=f},context={performance:{now:()=>now},window,document:{hidden:false,addEventListener:(e,f)=>listeners[e]=f},innerHeight:1000,innerWidth:1440,AbortController,matchMedia:()=>media,getComputedStyle:n=>({opacity:n.style.opacity||'1'}),requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i)};vm.runInNewContext(source,context);return{node,media,listeners,motion:window.TDBMotion,frames,tick(t,frameTime=t){now=t;const f=[...frames.values()];frames.clear();f.forEach(x=>x(frameTime));}}}
{
 const t=setup(),a=t.motion.ddText([t.node]);assert.equal(t.node.style.opacity,'');t.tick(0);assert.equal(+t.node.style.opacity,1);t.tick(125);assert.equal(+t.node.style.opacity,.5625);const b=t.motion.ddText([t.node]);assert.equal(t.frames.size,1);t.tick(250);assert.equal(+t.node.style.opacity,.5);assert.equal(t.frames.size,0);t.node.top=800;t.listeners.scroll();t.tick(266);assert(Math.abs(+t.node.style.opacity-.35)<1e-9);a.destroy();assert.notEqual(t.node.style.opacity,'');b.destroy();assert.equal(t.node.style.opacity,'');assert.equal(t.frames.size,0);b.destroy();
}
{
 const t=setup();t.node.top=1200;const a=t.motion.ddText([t.node]);t.tick(0);t.tick(250);assert.equal(+t.node.style.opacity,0);assert.equal(t.frames.size,0);t.node.top=600;t.listeners.scroll();t.tick(300);assert.equal(+t.node.style.opacity,.2);a.destroy();
}
{
 const t=setup(true);const a=t.motion.ddText([t.node]);t.tick(0);assert.equal(+t.node.style.opacity,1);t.tick(250);assert.equal(+t.node.style.opacity,.5);assert.equal(t.motion.reduced.matches,false);a.destroy();
}
{
 const t=setup();t.node.style.opacity='.8';const a=t.motion.ddText([t.node]);t.tick(0);assert.equal(+t.node.style.opacity,.8);t.tick(125);t.media.matches=true;t.tick(140);assert(+t.node.style.opacity<.8);t.tick(250);assert.equal(+t.node.style.opacity,.5);assert.equal(t.frames.size,0);a.destroy();assert.equal(t.node.style.opacity,'.8');
}
{const t=setup();const a=t.motion.ddText([t.node]);t.tick(1000,700);assert.equal(+t.node.style.opacity,1);t.tick(1016,1000);assert(+t.node.style.opacity>.9);t.tick(1250,1233);assert.equal(+t.node.style.opacity,.5);a.destroy();}
console.log('PASS: initial 250ms easing, normal scroll, offscreen settling, shared clients, full motion under OS preference changes, cleanup.');
