const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const window={},context={window,getComputedStyle:n=>({transform:n.paint})};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/sliders/swiper-behaviour.js'),'utf8'),context);
function fixture(){const events={},log=[];function slide(key,x,paint){const child={paint,style:{}};return{child,getAttribute:()=>key,getBoundingClientRect:()=>({left:x}),querySelectorAll:()=>[child]}}const s={params:{speed:700,loop:true,slidesPerGroup:1,loopPreventsSlide:false},activeIndex:1,animating:true,enabled:true,slides:[slide('0',-100,'matrix-old'),slide('1',0,'matrix-live'),slide('1',100,'matrix-clone')],wrapperEl:{paint:'matrix-wrapper',style:{},offsetWidth:100},isHorizontal:()=>true,on:(e,f)=>events[e]=f,getTranslate:()=>-100,setTranslate:x=>log.push(['translate',x]),slideTo:function(...args){log.push(['slideTo',...args]);return 'slide-result'},loopFix:function(){this.activeIndex=2;return 'loop-result'},slidePrev:function(...args){log.push(['original-prev',...args]);return 'prev-result'}};return{s,events,log}}
{
 const {s,events,log}=fixture(),original={slideTo:s.slideTo,loopFix:s.loopFix,slidePrev:s.slidePrev};window.TDBSwiper.bindSwiper(s);const wrapper=s.slideTo;window.TDBSwiper.bindSwiper(s);assert.equal(s.slideTo,wrapper);
 assert.equal(s.slideTo(2,700,true),'slide-result');assert.equal(s.wrapperEl.style.transform,'matrix-wrapper');assert.equal(s.slides[1].child.style.transform,'matrix-live');assert.equal(s.wrapperEl.style.transitionDuration,'0ms');assert.equal(s.loopFix(),'loop-result');assert.deepEqual(log.at(-1),['translate',-200]);assert.equal(s.slides[2].child.style.transform,'matrix-clone');
 events.beforeDestroy();assert.equal(s.slideTo,original.slideTo);assert.equal(s.loopFix,original.loopFix);assert.equal(s.slidePrev,original.slidePrev);
}
{
 const {s,log}=fixture();window.TDBSwiper.bindSwiper(s);s.enabled=false;assert.equal(s.slidePrev(),s);assert.equal(log.length,0);s.enabled=true;s.params.loopPreventsSlide=true;assert.equal(s.slidePrev(),false);assert.equal(log.length,0);s.params.loopPreventsSlide=false;assert.equal(s.slidePrev(450,true),'slide-result');assert.deepEqual(log.at(-1),['slideTo',1,450,true,undefined,undefined]);
 s.params.loop=false;assert.equal(s.slidePrev(450,false),'prev-result');assert.deepEqual(log.at(-1),['original-prev',450,false,undefined]);
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/tdb-motion.js'),'utf8'),context);assert.equal(window.TDBMotion.defaults.ddStartup,250);const {s}=fixture();window.TDBMotion.bindSwiper(s);assert.notEqual(s.slideTo.name,'slideTo');
console.log('PASS: interrupted movement capture, loop continuity, previous/disabled branches, idempotent binding, method restoration and legacy delegation.');
