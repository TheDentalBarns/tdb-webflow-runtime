const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
function setup() {
 const dom=new JSDOM('<section><div class="slide"></div></section>',{runScripts:'outside-only'}),w=dom.window;
 w.eval(fs.readFileSync(path.join(__dirname,'../src/sliders/swiper-gap.js'),'utf8')+'\nwindow.readGap=nativeGap;');
 return {dom,w,root:w.document.querySelector('section'),slide:w.document.querySelector('.slide')};
}
test('responsive native margins are read without retaining or losing Swiper inline overrides',()=>{
 const {dom,w,root,slide}=setup();try {
  slide.style.setProperty('margin-right','31px','important');let native='20px',reads=0;
  w.getComputedStyle=el=>{assert.equal(el,slide);assert.equal(slide.style.getPropertyValue('margin-right'),'');reads++;return {marginRight:native};};
  assert.equal(w.readGap(root,7,'.slide'),20);native='0px';assert.equal(w.readGap(root,7,'.slide'),0);native='8px';assert.equal(w.readGap(root,7,'.slide'),8);
  assert.equal(slide.style.getPropertyValue('margin-right'),'31px');assert.equal(slide.style.getPropertyPriority('margin-right'),'important');assert.equal(reads,3);
  w.getComputedStyle=()=>{throw Error('measurement interrupted');};assert.throws(()=>w.readGap(root,7,'.slide'),/interrupted/);assert.equal(slide.style.getPropertyValue('margin-right'),'31px');assert.equal(slide.style.getPropertyPriority('margin-right'),'important');
 } finally {dom.window.close();}
});
test('root gaps, missing slides and nonnumeric CSS preserve component fallbacks without scheduling work',()=>{
 const {dom,w,root,slide}=setup();try {
  w.getComputedStyle=()=>({columnGap:'26px',marginRight:'normal'});assert.equal(w.readGap(root,7),26);assert.equal(w.readGap(root,7,'.missing'),7);assert.equal(w.readGap(root,7,'.slide'),7);assert.equal(slide.hasAttribute('style'),false);
  w.getComputedStyle=()=>({columnGap:'normal'});assert.equal(w.readGap(root,7),7);
 }finally{dom.window.close();}
});
