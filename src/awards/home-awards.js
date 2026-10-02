/* Home awards: reuse the service recognition component, with desktop grid placement. */
(()=>{
  'use strict';
  if(document.documentElement.dataset.wfPage!=='677cf86df9952f978d94d8a9')return;
  function init(){
    const section=document.querySelector('.section_awards');
    const trio=document.querySelector('[data-tdb-service-awards]');
    if(!section||!trio||section.dataset.tdbAwardsLayout)return;
    section.dataset.tdbAwardsLayout='true';
    const component=section.querySelector('.faq3_component');
    const grid=section.querySelector('.faq3_content');
    const list=section.querySelector('.faq3_list');
    const intro=list.firstElementChild;
    const paragraph=intro.querySelector('p');
    const originalCopy=paragraph.textContent;
    const trioWrapper=trio.parentElement.parentElement;
    const originalParent=trioWrapper.parentElement;
    const originalNext=trioWrapper.nextSibling;
    const label=document.createElement('h3');
    label.className='tdb-home-awards-label text-style-tagline-restored';
    label.textContent='Our Awards';
    intro.classList.add('tdb-home-awards-intro');
    trioWrapper.classList.add('tdb-home-awards-trio');
    const desktop=matchMedia('(min-width:992px)');
    function place(){
      if(desktop.matches){
        component.insertBefore(intro,grid);
        component.insertBefore(trioWrapper,grid);
        list.prepend(label);
        paragraph.textContent='Recognition for our digital dentistry, patient care and the people behind The Dental Barns.';
      }else{
        list.prepend(intro);
        label.remove();
        originalParent.insertBefore(trioWrapper,originalNext);
        paragraph.textContent=originalCopy;
      }
    }
    place();desktop.addEventListener('change',place);
    // Let the existing accordion controller own its animations and open state.
    // Source order breaks ties between awards in the same latest year.
    const questions=Array.from(list.querySelectorAll('.faq3_question'));
    const newest=questions.reduce((best,q)=>{
      const year=Number(q.textContent.match(/\b20\d{2}\b/)?.[0]||0);
      return !best||year>best.year?{q,year}:best;
    },null);
    if(newest){
      window.Webflow=window.Webflow||[];
      window.Webflow.push(()=>requestAnimationFrame(()=>{
        const answer=newest.q.parentElement.querySelector('.faq3_answer');
        if(answer&&answer.getBoundingClientRect().height<1)newest.q.click();
      }));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
