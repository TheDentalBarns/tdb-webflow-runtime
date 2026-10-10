const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const window={addEventListener(){}},microtasks=[],context={window,document:{addEventListener(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),queueMicrotask:fn=>microtasks.push(fn),getComputedStyle:n=>({transform:n.paint})};
const read = name => fs.readFileSync(path.join(__dirname,'../src/sliders/',name),'utf8');
vm.runInNewContext(read('swiper-behaviour.js').replace('/* TDB_SWIPER_PLUGINS */',read('swiper-entry.js')+'\n'+read('swiper-gap.js')+'\n'+read('swiper-duration.js')+'\n'+read('swiper-plugins.js')),context);
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
{
 const {s,events,log}=fixture();s.wrapperEl.style.transitionTimingFunction='ease';s.slides[1].child.style.transitionTimingFunction='linear';s.touchEventsData={isMoved:true};window.TDBSwiper.bindSwiper(s);
 events.touchEnd();s.slideTo(2,700,true);assert.equal(s.wrapperEl.style.transitionTimingFunction,'cubic-bezier(.22,.61,.36,1)');assert.equal(s.slides[1].child.style.transitionTimingFunction,s.wrapperEl.style.transitionTimingFunction);assert.deepEqual(log.at(-1),['slideTo',2,700,true,undefined,undefined]);
 events.transitionEnd();assert.equal(s.wrapperEl.style.transitionTimingFunction,'ease');assert.equal(s.slides[1].child.style.transitionTimingFunction,'linear');
 events.touchEnd();s.slideTo(2,0,true,true);s.slideTo(3,700,true);assert.equal(s.wrapperEl.style.transitionTimingFunction,'cubic-bezier(.22,.61,.36,1)','loop correction preserves release');
 s.slideTo(4,700,true);assert.equal(s.wrapperEl.style.transitionTimingFunction,'ease','programmatic interruption restores component easing');assert.equal(s.wrapperEl.style.transform,'matrix-wrapper');
 events.touchEnd();while(microtasks.length)microtasks.shift()();s.slideTo(2,700,true);assert.equal(s.wrapperEl.style.transitionTimingFunction,'ease','a cancelled release cannot affect a later click');
 s.touchEventsData.isMoved=false;events.touchEnd();s.slideTo(2,700,true);assert.equal(s.wrapperEl.style.transitionTimingFunction,'ease','taps do not use touch release easing');
 s.touchEventsData.isMoved=true;events.touchEnd();s.slideTo(2,700,true);events.beforeDestroy();assert.equal(s.wrapperEl.style.transitionTimingFunction,'ease');assert.equal(s.slides[1].child.style.transitionTimingFunction,'linear');
}
console.log('PASS: touch release easing, unchanged snap target/speed, parallax timing, loop corrections, cancellation, programmatic interruption and teardown.');
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/tdb-motion.js'),'utf8'),context);assert.equal(window.TDBMotion.defaults.ddStartup,undefined);const {s}=fixture();window.TDBMotion.bindSwiper(s);assert.notEqual(s.slideTo.name,'slideTo');
console.log('PASS: interrupted movement capture, loop continuity, previous/disabled branches, idempotent binding, method restoration and legacy delegation.');
