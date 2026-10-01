const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../../',p),'utf8');
const review=read('src/reviews/review-drawer.js');
function reviewFixture(viewportWidth,rootWidth,desktop,gap=30){
 const properties=new Map();
 const context=vm.createContext({homeDesktop:()=>desktop,root:{clientWidth:rootWidth,getBoundingClientRect:()=>({width:rootWidth}),style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k)},classList:{toggle(){}}},viewport:{clientWidth:viewportWidth,clientHeight:720},getComputedStyle:()=>({columnGap:String(gap),getPropertyValue:()=>20}),centredDesktop:false,compact:false,perView:0,width:0,height:0,centre:0,stride:0,active:0,finish(){},paint(){},positionStaticQuote(){},revealQuotes(){},recordIndex:x=>x,last:()=>10});
 vm.runInContext(review.slice(review.indexOf('    function measure(){'),review.indexOf("    viewport.addEventListener('pointerdown'")),context);context.measure();return {context,properties};
}
test('homepage review neighbours meet the globally padded edges with two rem-scaled gaps',()=>{
 for(const [vw,rw,gap] of [[992,932.48,24],[1363,1281.25,29.8398],[1920,1804.8,42],[2560,2200,48]]){
  const {context:c}=reviewFixture(vw,rw,true,gap);
  assert.ok(Math.abs(c.centre-c.stride-(vw-rw)/2)<.001);
  assert.ok(Math.abs(c.centre+c.stride+c.width-(vw+rw)/2)<.001);
 }
});
test('tablet and mobile review widths retain their existing calculations',()=>{
 for(const [vw,rw] of [[390,366.6],[767,720.98],[991,931.54]]){
  const {context:c,properties}=reviewFixture(vw,rw,false);
  const compact=rw<=767,perView=compact?1:vw>=1000?3:vw>=680?2:1;
  assert.equal(c.width,compact?rw:(vw-20*(perView-1))/perView);
  assert.ok(Math.abs(c.stride-c.width-(compact?vw*.02:20))<.001);
  assert.equal(properties.has('--ri-card-width'),false);
 }
});
test('full-width IG desktop spacing changes without touching columns or smaller breakpoints',()=>{
 for(const file of ['src/instagram/instagram-feed.js','dist/tdb-instagram-feed.js','dist/tdb-home-desktop-instagram.js']){
  const s=read(file),start=s.indexOf('      const fullWidthDesktop =');
  const body=s.slice(start,s.indexOf('      if (swiper',start))+'\nresult=gap;';
  for(const width of [390,767,768,991,992,1920])for(const full of [true,false]){
   const c=vm.createContext({window:{innerWidth:width},component:{closest:()=>full},getComputedStyle:()=>({columnGap:'32px'})});vm.runInContext(body,c);
   assert.equal(c.result,width>=992&&full?32:width<768?width*.02:20);
  }
 }
});
