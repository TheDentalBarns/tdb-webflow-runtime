
(()=>{
if(!/^\/(?:first-visit\/?$|services\/|treatments\/|areas\/)/.test(location.pathname))return;
const mobile=matchMedia('(max-width:767px)');
const reduced=window.TDBMotionPolicy.reduced;
document.querySelectorAll('.service-process_sticky').forEach(rail=>{
 if(rail.hasAttribute('data-tdb-process-nav'))return;
 const entries=[...rail.querySelectorAll('.service-process_item[href^="#"]')].map(a=>({a,target:document.getElementById(a.hash.slice(1))})).filter(x=>x.target);
 if(!entries.length)return;
 rail.setAttribute('data-tdb-process-nav','');
 let active=-1,frame=0,lastY=-1;
 function center(i){
  const a=entries[i].a.getBoundingClientRect(),r=rail.getBoundingClientRect();
  rail.scrollTo({left:Math.max(0,Math.min(rail.scrollWidth-rail.clientWidth,rail.scrollLeft+a.left-r.left+a.width/2-r.width/2)),behavior:reduced.matches?'instant':'smooth'});
 }
 function update(){
  frame=0;
  if(!mobile.matches)return;
  const y=window.scrollY;
  if(y===lastY)return;
  lastY=y;
  const edge=rail.getBoundingClientRect().height+innerHeight*.2;
  let i=0;
  entries.forEach((x,n)=>{if(x.target.getBoundingClientRect().top<=edge)i=n});
  if(i!==active){active=i;center(i)}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',()=>{lastY=-1;active=-1;schedule()},{passive:true});
 rail.addEventListener('click',e=>{
  const a=e.target.closest('.service-process_item[href^="#"]');
  if(!mobile.matches||!a||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const entry=entries.find(x=>x.a===a);
  if(!entry)return;
  e.preventDefault();e.stopPropagation();
  const top=window.scrollY+entry.target.getBoundingClientRect().top-rail.getBoundingClientRect().height;
  if(location.hash!==a.hash)history.pushState(null,'',a.hash);
  window.scrollTo({top:Math.max(0,top),behavior:reduced.matches?'instant':'smooth'});
 },true);
 update();
});
})();
