/* TDB review quote adapter v2.0.0. Native component + shared quote carousel. */
(() => {
'use strict'; if(window.TDBReviewQuotes)return;
const instances=new WeakMap();
function mount(root,data,{openReviews}) {
 if(instances.has(root))return instances.get(root);
 const track=root.querySelector('[data-tdb-team-track]');
 const originals=[...track.children];
 const records=data.featured.map(id=>data.records.find(record=>record.id===id)).filter(Boolean);
 if(!records.length)return {destroy(){}};
 // Hydrate the authored cards in place; never replace the component or its layout.
 // Only CMS count changes require adding/removing a card.
 const template=originals[0].cloneNode(true);
 while(track.children.length>records.length)track.lastElementChild.remove();
 while(track.children.length<records.length)track.append(template.cloneNode(true));
 records.forEach((record,index)=>{
  const card=track.children[index];card.dataset.reviewId=record.id;
  card.querySelector('[data-tdb-team-text]').textContent=record.excerpt;
  card.querySelector('[data-tdb-quotes-name]').textContent=record.name;
  card.querySelector('[data-tdb-quotes-source]').replaceChildren(...window.TDBReviewCMS.sourceIcon(record.platform,true).childNodes);
  const trigger=card.querySelector('[data-tdb-quote-action]');
  trigger.setAttribute('aria-label','Read full review by '+record.name);
  trigger.setAttribute('aria-disabled','false');trigger.setAttribute('tabindex','0');
 });
 const carousel=window.TDBQuoteCarousel.mount(root,{onActivate:({trigger,slide,signal})=>
  openReviews({trigger,reviewId:slide.dataset.reviewId,signal})});
 const api={swiper:carousel.swiper,destroy(){
  carousel.destroy();
  root.querySelectorAll('[data-tdb-quote-action]').forEach(trigger=>{
   trigger.setAttribute('aria-disabled','true');trigger.setAttribute('tabindex','-1');
  });
  instances.delete(root);
 }};
 instances.set(root,api);return api;
}
window.TDBReviewQuotes=Object.freeze({version:'2.0.0',mount});
window.TDBSwiper?.register('review-testimonials',window.TDBReviewQuotes);
})();
