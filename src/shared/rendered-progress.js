/* Shared rendered-progress scheduler v1.0.0. No polling while a track is idle. */
(() => {
 'use strict';
 if(window.TDBRenderedProgress)return;
 function observe({track,paint,enabled=()=>true,onMutation}){
  let frame=0,disposed=false;
  const allowed=()=>!disposed&&!document.hidden&&enabled();
  function pause(){cancelAnimationFrame(frame);frame=0;}
  function schedule(){if(!frame&&allowed())frame=requestAnimationFrame(tick);}
  function tick(){
   frame=0;if(!allowed())return;
   paint();
   // CSS transitions keep moving without further style mutations. Sample the
   // compositor until they finish; drag/zero-speed writes wake the observer.
   if(track.getAnimations().some(a=>a.playState==='running'||a.pending))schedule();
  }
  const changes=new MutationObserver(records=>{onMutation?.(records);schedule();});
  changes.observe(track,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','data-swiper-slide-index']});
  const events=['transitionrun','transitionstart','transitionend','transitioncancel'];
  events.forEach(event=>track.addEventListener(event,schedule,{passive:true}));
  return {schedule,pause,destroy(){disposed=true;pause();changes.disconnect();events.forEach(event=>track.removeEventListener(event,schedule));}};
 }
 window.TDBRenderedProgress=Object.freeze({version:'1.0.0',observe});
})();
