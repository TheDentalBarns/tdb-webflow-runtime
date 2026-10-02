/* Homepage service position indicator. Samples the rendered slide positions,
 * so drag, CSS easing, interruptions and duplicate loop copies share one clock. */
(() => {
  if(document.documentElement.dataset.wfPage!=='677cf86df9952f978d94d8a9')return;
  const selector='.section_gallery14 .parallax-swiper_component:not(.tdb-banner-parallax)';
  const style=document.createElement('style');
  style.textContent=`${selector} > .swiper > .tdb-service-progress{position:absolute;left:0;right:0;bottom:0;width:100%;height:5px;margin:0;padding:0;border:0;border-radius:0;background:#222222;opacity:1;z-index:30;pointer-events:none;overflow:hidden}${selector} .tdb-service-progress-fill{display:block;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:0;background:#000000;opacity:1;transform-origin:left center;transition:none!important}`;
  document.head.append(style);
  function bind(component){
    const viewport=component.querySelector(':scope > .swiper'),swiper=viewport?.swiper;
    if(!swiper||swiper.destroyed||viewport.querySelector(':scope > .tdb-service-progress'))return false;
    const track=document.createElement('div'),fill=document.createElement('span');
    track.className='tdb-service-progress';fill.className='tdb-service-progress-fill';
    track.setAttribute('aria-hidden','true');track.append(fill);viewport.append(track);
    let frame=0,dragging=false,looping=false;
    function paint(){
      if(swiper.destroyed||looping)return;
      const slides=[...swiper.slides];
      const count=new Set(slides.map((s,i)=>s.getAttribute('data-swiper-slide-index')??String(i))).size;
      if(!count)return;
      const box=viewport.getBoundingClientRect(),center=box.left+box.width/2;
      const points=slides.map((s,i)=>{const r=s.getBoundingClientRect();return{x:r.left+r.width/2-center,value:(Number(s.getAttribute('data-swiper-slide-index')??i)+1)/count};}).sort((a,b)=>a.x-b.x);
      const right=points.findIndex(p=>p.x>=0);let value;
      if(right<=0)value=points[right<0?points.length-1:0].value;
      else{const a=points[right-1],b=points[right],t=-a.x/(b.x-a.x);value=a.value+(b.value-a.value)*t;}
      fill.style.transform=`scaleX(${Math.max(0,Math.min(1,value))})`;
    }
    function tick(){frame=0;paint();if(dragging||swiper.animating)frame=requestAnimationFrame(tick);}
    function schedule(){if(!frame)frame=requestAnimationFrame(tick);}
    const start=()=>{dragging=true;schedule();},end=()=>{dragging=false;schedule();};
    swiper.on('touchStart',start);swiper.on('touchEnd',end);
    const events=['setTranslate','setTransition','transitionStart','transitionEnd','resize','update'];
    events.forEach(event=>swiper.on(event,schedule));
    swiper.on('beforeLoopFix',()=>{looping=true;});swiper.on('loopFix',()=>{looping=false;schedule();});
    swiper.on('beforeDestroy',()=>{cancelAnimationFrame(frame);track.remove();observer.observe(component,{subtree:true,attributes:true,attributeFilter:['class']});});
    paint();schedule();return true;
  }
  const observer=new MutationObserver(()=>{document.querySelectorAll(selector).forEach(bind);});
  document.querySelectorAll(selector).forEach(component=>{if(!bind(component))observer.observe(component,{subtree:true,attributes:true,attributeFilter:['class']});});
})();
