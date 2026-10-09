
(()=>{
 if(!/^\/services\/smile-design\/?$/.test(location.pathname))return;
 function start(){
  const button=document.querySelector('main a[href="#All-treatments"]');
  if(!button)return;
  button.setAttribute('href','#VIP');
  button.setAttribute('aria-label','Join the Smile Design Waitlist');
  button.firstElementChild.textContent='Join the Smile Design Waitlist';
  button.querySelector('.is-down')?.classList.remove('is-down');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
