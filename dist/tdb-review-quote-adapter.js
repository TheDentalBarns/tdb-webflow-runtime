/* TDB review quote adapter v2.1.0. Native component + shared quote carousel. */
(() => {
'use strict'; if(window.TDBReviewQuotes)return;
const instances=new WeakMap();
const assets=new Map();
function platformAsset(platform){
 if(assets.has(platform))return assets.get(platform);
 const template=[...document.querySelectorAll('[data-tdb-review-icon]')].find(node=>node.dataset.tdbReviewIcon===platform);
 const url=template?.querySelector('image')?.getAttribute('href')||'';
 if(url)assets.set(platform,url);
 return url;
}
function mount(root,data,{openReviews}) {
 if(instances.has(root))return instances.get(root);
 const track=root.querySelector('[data-tdb-team-track]');
 // Selection order is supplied by the consumer; no fixed names or feed positions.
 const records=data.featured.map(id=>data.getCached(id)).filter(Boolean);
 if(!records.length)return {destroy(){}};
 // Hydrate the authored cards in place; never replace the component or its layout.
 // Only CMS count changes require adding/removing a card.
 const template=track.children.length<records.length?track.firstElementChild.cloneNode(true):null;
 while(track.children.length>records.length)track.lastElementChild.remove();
 while(track.children.length<records.length)track.append(template.cloneNode(true));
 records.forEach((record,index)=>{
  const card=track.children[index];card.dataset.reviewId=record.id;
  card.querySelector('[data-tdb-team-text]').textContent=record.excerpt;
  card.querySelector('[data-tdb-quotes-name]').textContent=record.name;
  const source=card.querySelector('[data-tdb-quotes-source]'),asset=platformAsset(record.platform);
  source.dataset.reviewPlatform=record.platform;
  source.style.backgroundImage=asset?`url("${asset}")`:'none';
  source.style.width=asset?'':'auto';
  source.textContent=asset?'':record.platform;
  source.setAttribute('aria-hidden','true');
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
window.TDBReviewQuotes=Object.freeze({version:'2.1.0',mount});
window.TDBSwiper?.register('review-testimonials',window.TDBReviewQuotes);
})();
