/* Homepage service position indicator. Samples the rendered slide positions,
 * so drag, CSS easing, interruptions and duplicate loop copies share one clock. */
(() => {
  if(document.documentElement.dataset.wfPage!=='677cf86df9952f978d94d8a9')return;
  const selector='.section_gallery14 .parallax-swiper_component:not(.tdb-banner-parallax),#All-treatments .tdb-banner-parallax';
  const style=document.createElement('style');
  style.textContent=`:is(${selector}) > .tdb-service-progress{position:absolute;left:0;top:100%;width:100%;height:5px;margin:0;padding:0;border:0;border-radius:0;background:rgba(214,202,180,.5);opacity:1;z-index:30;pointer-events:none;overflow:hidden}:is(${selector}) .tdb-service-progress-fill{display:block;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:0;background:#000000;opacity:1;transform-origin:left center;transition:none!important}#All-treatments .tdb-service-progress-fill{background:var(--base-color-brand--orange-1,#f9f2e6)!important}`;
  document.head.append(style);
  function bind(component){
    const viewport=component.querySelector(':scope > .swiper'),wrapper=viewport?.querySelector(':scope > .swiper-wrapper');
    if(!wrapper||component.querySelector(':scope > .tdb-service-progress'))return false;
    const treatment=!!component.closest('#All-treatments');
    const track=document.createElement('div'),fill=document.createElement('span');
    track.className='tdb-service-progress';fill.className='tdb-service-progress-fill';
    track.setAttribute('aria-hidden','true');track.append(fill);component.append(track);
    let frame=0,stable=0,last=null;
    function paint(){
      const slides=[...wrapper.children].filter(s=>s.classList.contains('swiper-slide')); 
      const count=new Set(slides.map((s,i)=>s.getAttribute('data-swiper-slide-index')??String(i))).size;
      if(!count)return null;
      const box=viewport.getBoundingClientRect(),leftAligned=treatment&&(innerWidth<768||innerWidth>=992),center=box.left+(leftAligned?0:box.width/2);
      const points=slides.map((s,i)=>{const r=s.getBoundingClientRect();return{x:r.left+(leftAligned?0:r.width/2)-center,value:(Number(s.getAttribute('data-swiper-slide-index')??i)+1)/count};}).sort((a,b)=>a.x-b.x);
      const right=points.findIndex(p=>p.x>=0);let value;
      if(right<=0)value=points[right<0?points.length-1:0].value;
      else{const a=points[right-1],b=points[right],t=-a.x/(b.x-a.x);value=a.value+(b.value-a.value)*t;}
      fill.style.width=(100/count)+'%';
      fill.style.transform=`translateX(${Math.max(0,Math.min(count-1,value*count-1))*100}%)`;
      return getComputedStyle(wrapper).transform;
    }
    function tick(){frame=0;const pose=paint();stable=pose===last?stable+1:0;last=pose;if(stable<3)frame=requestAnimationFrame(tick);}
    function schedule(){stable=0;if(!frame)frame=requestAnimationFrame(tick);}
    // Observe only the moving track, never the bar we write to.
    const movement=new MutationObserver(schedule);
    movement.observe(wrapper,{attributes:true,attributeFilter:['style'],childList:true});
    function layout(){track.style.top=(viewport.offsetTop+viewport.offsetHeight)+'px';track.style.left=(treatment?-component.getBoundingClientRect().left:viewport.offsetLeft)+'px';track.style.width=(treatment?document.documentElement.clientWidth:viewport.offsetWidth)+'px';schedule();}
    new ResizeObserver(layout).observe(viewport);
    if(treatment)window.addEventListener('resize',layout,{passive:true});
    layout();
    wrapper.addEventListener('transitionend',schedule);
    paint();schedule();return true;
  }
  const observer=new MutationObserver(()=>{document.querySelectorAll(selector).forEach(bind);});
  const treatments=document.querySelector('#All-treatments');
  if(treatments)observer.observe(treatments,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.querySelectorAll(selector).forEach(component=>{if(!bind(component))observer.observe(component,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});});
})();
