const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../src/shared/motion.js'),'utf8');
function setup({opacity='1',top=500,height=100,root=false,rootScrollHeight=3000,mode='viewport',preset='standard'}={}){
 const dom=new JSDOM(`<section><p style="opacity:${opacity}">DD text</p></section>`,{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const node=w.document.querySelector('p'),section=w.document.querySelector('section'),frames=new Map();let seq=0,now=100,shown=true;
 w.innerHeight=1000;w.scrollY=0;Object.defineProperty(w.document.documentElement,'scrollHeight',{value:10000});
 Object.defineProperty(section,'clientHeight',{value:600});Object.defineProperty(section,'scrollHeight',{value:rootScrollHeight});section.getBoundingClientRect=()=>({top:100});
 node.getClientRects=()=>shown?[{}]:[];node.getBoundingClientRect=()=>{const y=top-(root?section.scrollTop:w.scrollY);return{top:y,bottom:y+height,height};};
 w.performance.now=()=>now;w.requestAnimationFrame=fn=>{frames.set(++seq,fn);return seq;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.matchMedia=()=>({matches:true,addEventListener(){}});w.eval(source);
 const api=w.TDBMotion.ddText([node],{mode,preset,root:root?section:null});
 function flush(){let n=0;while(frames.size&&n++<150){const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(now));}assert(n<150,'no runaway animation');}
 function scroll(value,user=true){now+=30;const target=root?section:w;if(user)target.dispatchEvent(new w.WheelEvent('wheel'));if(root)section.scrollTop=value;else w.scrollY=value;target.dispatchEvent(new w.Event('scroll'));flush();}
 function layout(value){top=value;w.dispatchEvent(new w.Event('resize'));flush();}
 flush();return{w,node,section,api,frames,flush,scroll,layout,value:()=>+node.style.opacity,setShown:v=>{shown=v},close:()=>{api.destroy();dom.window.close();}};
}
test('late JS retains the painted value indefinitely; only user scrolling consumes the offset',()=>{
 const t=setup();try{assert.equal(t.value(),1);assert.equal(t.frames.size,0);t.flush();assert.equal(t.value(),1);t.scroll(100);assert(t.value()<1&&t.value()>.5);const held=t.value();t.flush();assert.equal(t.value(),held);assert.equal(t.frames.size,0);}finally{t.close();}
});
test('browser restoration, resize and pageshow retain opacity and never write layout or scroll position',()=>{
 const t=setup({opacity:'.65'});try{t.scroll(150,false);assert.equal(t.value(),.65);t.layout(620);assert.equal(t.value(),.65);t.w.dispatchEvent(new t.w.Event('pageshow'));t.flush();assert.equal(t.value(),.65);assert.equal(t.w.scrollY,150);assert.equal(t.node.style.transform,'');assert.equal(t.node.style.height,'');t.scroll(200);assert.notEqual(t.value(),.65);}finally{t.close();}
});
test('the first exit aligns the normal curve; the next pass uses the original viewport timing',()=>{
 const t=setup();try{t.scroll(650);assert(Math.abs(t.value()-.1)<1e-8);t.scroll(0);assert(Math.abs(t.value()-.5)<.001);t.scroll(-200);assert(Math.abs(t.value()-.3)<.001);}finally{t.close();}
});
test('native region mapping includes text height and preserves orange keyframes',()=>{
 const t=setup({mode:'native',preset:'orange',height:200});try{t.scroll(750);assert(Math.abs(t.value()-.5)<1e-8);t.scroll(0);assert(Math.abs(t.value()-(.3+(500/1200)*1.4))<.001);assert.equal(t.w.TDBMotion.ddOpacity(.6,'orange'),1);}finally{t.close();}
});
test('nested Gallery scrolling is independent from document scroll',()=>{
 const t=setup({root:true,mode:'region',top:400,opacity:'.65'});try{assert.equal(t.value(),.65);t.w.scrollY=400;t.w.dispatchEvent(new t.w.Event('scroll'));t.flush();assert.equal(t.value(),.65);t.scroll(500);assert(Math.abs(t.value()-.1)<1e-8);t.scroll(0);assert(Math.abs(t.value()-(300/700))<.001);}finally{t.close();}
});
test('reversing scroll does not bring back consumed startup opacity',()=>{
 const t=setup();try{t.scroll(100);const forward=t.value();t.scroll(0);assert(t.value()<1);t.scroll(100);assert(t.value()<=forward+.001);}finally{t.close();}
});
test('late restoration of an initially offscreen node preserves its fallback',()=>{
 const t=setup({top:2500,opacity:'.5'});try{assert.equal(t.value(),.5);t.scroll(2200,false);assert.equal(t.value(),.5);t.scroll(2250);assert(t.value()<=.5);assert.equal(t.frames.size,0);}finally{t.close();}
});
test('mounting twice shares ownership and cleanup restores authored opacity',()=>{
 const t=setup({opacity:'.8'});try{const second=t.w.TDBMotion.ddText([t.node]);t.scroll(100);const value=t.value();t.api.destroy();assert.equal(t.value(),value);second.destroy();assert.equal(t.node.style.opacity,'0.8');assert.equal(t.frames.size,0);second.destroy();}finally{t.close();}
});
test('a hidden node is retained when it is first displayed',()=>{
 const t=setup({opacity:'.7'});try{t.setShown(false);t.layout(600);assert.equal(t.value(),.7);t.setShown(true);t.layout(400);assert.equal(t.value(),.7);}finally{t.close();}
});
test('full motion policy remains enabled even when OS requests reduced motion',()=>{
 const t=setup();try{assert.equal(t.w.TDBMotion.reduced.matches,false);t.scroll(100);assert(t.value()<1);}finally{t.close();}
});

test('a faded first paint never brightens beyond the normal peak during catch-up',()=>{
 const t=setup({opacity:'.5',top:990});try{t.scroll(300);assert(t.value()<=.5);t.scroll(600);assert(t.value()<=.5);t.scroll(1100);assert(Math.abs(t.value()-.1)<.001);}finally{t.close();}
});

test('a caption in a short scrolling case reaches its curve at the reachable scroll limit',()=>{
 const t=setup({root:true,rootScrollHeight:700,mode:'region',top:400});try{assert.equal(t.value(),1);t.scroll(50);assert(t.value()<1&&t.value()>.5);t.scroll(100);assert(Math.abs(t.value()-.5)<.001);t.scroll(0);assert(Math.abs(t.value()-(300/700))<.001);}finally{t.close();}
});
