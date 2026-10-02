/* Home awards: service recognition rows on mobile, a three-column desktop grid. */
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
    const mobile=matchMedia('(max-width:767px)');
    const instagram=grid.querySelector('.award-image_left');
    function place(){
      if(desktop.matches||mobile.matches){
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
      // DOM order follows the mobile reading/tab order as well as the visual order.
      if(instagram){
        if(mobile.matches)grid.insertBefore(instagram,list);
        else grid.append(instagram);
      }
    }
    place();desktop.addEventListener('change',place);mobile.addEventListener('change',place);
    // Webflow's late IX setup can reset an accordion opened with a synthetic
    // click. Own this section's state explicitly, including keyboard and ARIA.
    const questions=Array.from(list.querySelectorAll('.faq3_question'));
    const newest=questions.reduce((best,q)=>{
      const year=Number(q.textContent.match(/\b20\d{2}\b/)?.[0]||0);
      return !best||year>best.year?{q,year}:best;
    },null);
    questions.forEach((question,index)=>{
      const item=question.parentElement;
      const answer=item.querySelector('.faq3_answer');
      if(!answer)return;
      const id='tdb-home-award-answer-'+index;
      answer.id=id;answer.setAttribute('role','region');
      question.id='tdb-home-award-question-'+index;
      question.setAttribute('role','button');question.tabIndex=0;
      question.setAttribute('aria-controls',id);
      answer.setAttribute('aria-labelledby',question.id);
      function measure(){
        const height=[...answer.children].reduce((sum,child)=>{
          const css=getComputedStyle(child);
          return sum+child.getBoundingClientRect().height+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0);
        },0);
        item.style.setProperty('--tdb-award-answer-height',Math.ceil(height)+'px');
      }
      function setOpen(open){
        measure();item.dataset.tdbAwardOpen=String(open);
        question.setAttribute('aria-expanded',String(open));
        answer.setAttribute('aria-hidden',String(!open));answer.inert=!open;
      }
      function toggle(event){
        event.preventDefault();event.stopImmediatePropagation();
        setOpen(item.dataset.tdbAwardOpen!=='true');
      }
      setOpen(question===newest?.q);
      question.addEventListener('click',toggle,true);
      question.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' ')toggle(event);
      },true);
      const observer=new ResizeObserver(measure);
      [...answer.children].forEach(child=>observer.observe(child));
    });
    requestAnimationFrame(()=>section.setAttribute('data-tdb-awards-motion',''));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
