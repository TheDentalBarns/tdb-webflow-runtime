/* Homepage service position indicator. Samples the rendered slide positions,
 * so drag, CSS easing, interruptions and duplicate loop copies share one clock. */
(() => {
  if(document.documentElement.dataset.wfPage!=='677cf86df9952f978d94d8a9')return;
  const selector='.section_gallery14 .parallax-swiper_component:not(.tdb-banner-parallax),#All-treatments .tdb-banner-parallax';
  const style=document.createElement('style');
  style.textContent=`:is(${selector}) > .tdb-service-progress{position:absolute;left:0;top:100%;width:100%;height:5px;margin:0;padding:0;border:0;border-radius:0;background:rgba(214,202,180,.5);opacity:1;z-index:30;pointer-events:none;overflow:hidden}:is(${selector}) .tdb-service-progress-fill{position:absolute;left:0;top:0;display:block;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:0;background:#000000;opacity:1;transform-origin:left center;transition:none!important}#All-treatments .tdb-service-progress-fill{background:var(--base-color-brand--orange-1,#f9f2e6)!important}`;
  document.head.append(style);
  const bindings=new WeakMap();
  function bind(component){
    const viewport=component.querySelector(':scope > .swiper'),wrapper=viewport?.querySelector(':scope > .swiper-wrapper');
    if(!wrapper)return false;
    const previous=bindings.get(component);
    if(previous?.wrapper===wrapper)return true;
    previous?.dispose();
    component.querySelector(':scope > .tdb-service-progress')?.remove();
    const treatment=!!component.closest('#All-treatments');
    const track=document.createElement('div'),fill=document.createElement('span');
    track.className='tdb-service-progress';fill.className='tdb-service-progress-fill';
    const wrapped=fill.cloneNode();
    track.setAttribute('aria-hidden','true');track.append(fill,wrapped);component.append(track);
    let frame=0,visible=false,disposed=false,lastTravel=null,lastSegment=null;
    function paint(){
      const slides=[...wrapper.children].filter(s=>s.classList.contains('swiper-slide')); 
      const count=new Set(slides.map((s,i)=>s.getAttribute('data-swiper-slide-index')??String(i))).size;
      if(!count)return null;
      const box=viewport.getBoundingClientRect(),leftAligned=treatment&&(innerWidth<768||innerWidth>=992),center=box.left+(leftAligned?0:box.width/2);
      const points=slides.map((s,i)=>{const r=s.getBoundingClientRect();return{x:r.left+(leftAligned?0:r.width/2)-center,value:Number(s.getAttribute('data-swiper-slide-index')??i)};}).sort((a,b)=>a.x-b.x);
      const right=points.findIndex(p=>p.x>=0);let value;
      if(right<=0)value=points[right<0?points.length-1:0].value;
      else{const a=points[right-1],b=points[right],t=-a.x/(b.x-a.x);// Adjacent rendered loop copies advance through N to 0, never rewind.
        const step=(b.value-a.value+count)%count;
        value=a.value+step*t;}
      const dpr=window.devicePixelRatio||1,trackWidth=track.getBoundingClientRect().width;
      const segment=Math.round(trackWidth*dpr/count)/dpr;
      const phase=((value%count)+count)%count;
      // Keep each settled position, with one extra segment-length step at the seam.
      const position=count<=1?0:phase<=count-1
        ? phase*(trackWidth-segment)/(count-1)
        : trackWidth-segment+(phase-count+1)*segment;
      const travel=Math.round(position*dpr)/dpr;
      if(segment!==lastSegment){
        for(const marker of [fill,wrapped])marker.style.width=segment+'px';
        lastSegment=segment;
      }
      const pose=travel+':'+trackWidth;
      if(pose!==lastTravel){
        fill.style.transform=`translateX(${travel}px)`;
        wrapped.style.transform=`translateX(${travel-trackWidth}px)`;
        lastTravel=pose;
      }
    }
    // Keep sampling rendered geometry for the entire visible lifetime. Mobile
    // touch/compositor movement can start after several unchanged frames.
    // Reduced motion changes slider timing, never whether its position is read.
    function tick(){
      frame=0;
      if(disposed||document.hidden||!visible)return;
      paint();
      frame=requestAnimationFrame(tick);
    }
    function schedule(){if(!disposed&&!document.hidden&&visible&&!frame)frame=requestAnimationFrame(tick);}
    const visibility=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting);
      if(visible){layout();paint();schedule();}
      else{cancelAnimationFrame(frame);frame=0;}
    },{rootMargin:'100px'});
    visibility.observe(viewport);
    function resume(){
      cancelAnimationFrame(frame);frame=0;
      if(!document.hidden){layout();paint();schedule();}
    }
    document.addEventListener('visibilitychange',resume);
    // Observe only the moving track, never the bar we write to.
    const movement=new MutationObserver(schedule);
    movement.observe(wrapper,{subtree:true,attributes:true,attributeFilter:['style','class','data-swiper-slide-index'],childList:true});
    function layout(){
      // Preserve fractional geometry: offsetTop/offsetHeight round separately
      // and can leave a one-pixel gap between the image and its track.
      const box=viewport.getBoundingClientRect(),parent=component.getBoundingClientRect();
      track.style.top=(box.bottom-parent.top-component.clientTop)+'px';
      const dpr=window.devicePixelRatio||1;
      // Snap inward to physical pixels so neither edge bleeds beyond the image.
      const left=Math.ceil((treatment?0:box.left)*dpr)/dpr;
      const right=Math.floor((treatment?document.documentElement.clientWidth:box.right)*dpr)/dpr;
      track.style.left=(left-parent.left-component.clientLeft)+'px';
      track.style.width=Math.max(0,right-left)+'px';
      schedule();
    }
    const resize=new ResizeObserver(layout);resize.observe(viewport);
    window.addEventListener('resize',layout,{passive:true});
    layout();
    const events=['transitionrun','transitionstart','transitionend','transitioncancel','pointerdown','pointermove','pointerup','pointercancel'];
    events.forEach(event=>wrapper.addEventListener(event,schedule,{passive:true}));
    bindings.set(component,{wrapper,dispose(){
      disposed=true;visibility.disconnect();movement.disconnect();resize.disconnect();cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('resize',layout);
      events.forEach(event=>wrapper.removeEventListener(event,schedule));
      track.remove();
    }});
    paint();schedule();return true;
  }
  const observer=new MutationObserver(()=>{document.querySelectorAll(selector).forEach(bind);});
  const treatments=document.querySelector('#All-treatments');
  if(treatments)observer.observe(treatments,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.querySelectorAll(selector).forEach(component=>{bind(component);observer.observe(component,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});});
})();
