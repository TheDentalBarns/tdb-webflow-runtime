/* Staging home-page embed. Other pages keep their existing review widget. */
(function(){
  'use strict';
  const host=document.currentScript.closest('.w-embed');
  if(!host)return;
  if(location.hostname!=='dentalbarns.webflow.io'||location.pathname.replace(/\/+$/,'')!==''){
    const legacy=document.createElement('div');legacy.className='elfsight-app-616d754e-cd36-44fc-bf8e-49bde9baae09';legacy.setAttribute('data-elfsight-app-lazy','');host.append(legacy);return;
  }
  const style=document.createElement('style');style.dataset.tdbEmbeddedReviewStyles='1.3.0';style.textContent=__EMBEDDED_CSS__;document.head.append(style);
  host.closest('.section_google-reviews')?.classList.add('tdb-review-inline-section');
  const root=document.createElement('div');root.className='tdb-ri swiper';root.setAttribute('role','region');root.setAttribute('aria-label','Patient reviews');root.setAttribute('aria-roledescription','carousel');root.setAttribute('aria-busy','true');root.dataset.tdbEmbeddedReviews='';
  // Reuse the drawer's staging-only narrow preview for the embedded card layout.
  if(new URLSearchParams(location.search).get('review-preview')==='mobile'){root.style.width='min(390px,100%)';root.style.marginInline='auto';}
  const loading=document.createElement('div');loading.className='tdb-ri-loading';loading.setAttribute('role','status');loading.textContent='Loading patient reviews…';root.append(loading);host.append(root);
  let pending=false,observer;
  async function start(){
    if(pending||root.dataset.reviewMounted)return;
    if(!window.TDBPowerSnippets?.loadDrawer){if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',start,{once:true});return;}}
    pending=true;
    try{await(await window.TDBPowerSnippets.loadDrawer()).mountEmbedded(root);observer?.disconnect();}
    catch(_){root.removeAttribute('aria-busy');loading.textContent='The reviews could not load. ';const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.addEventListener('click',start);loading.append(retry);}
    finally{pending=false;}
  }
  if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))start();},{rootMargin:'600px'});observer.observe(root);}else start();
  root.addEventListener('pointerenter',start,{once:true});root.addEventListener('focusin',start,{once:true});
})();
