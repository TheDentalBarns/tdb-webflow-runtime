const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const source = process.env.TDB_REVIEW_SOURCE ? fs.readFileSync(process.env.TDB_REVIEW_SOURCE, 'utf8') : read('src/reviews/native/drawer-content.js');
const drain = () => new Promise(resolve => setImmediate(resolve));

function setup() {
 const dom = new JSDOM(read('tests/fixtures/review-drawer-native.html'), {url:'https://fixture.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,root=w.document.querySelector('[data-tdb-reviews]'),track=root.querySelector('[data-tdb-reviews-track]');
 let swiper,settled,drawerOptions,filterOptions,resolveFetch,fetchDeferred=false,fetches=0,loads=0;
 const all=Array.from({length:85},(_,i)=>({id:'r'+(i+1),name:'Reviewer '+(i+1),text:'Full review '+(i+1),excerpt:'Excerpt '+(i+1),excerpts:{},displayDate:'10 October 2026',rating:5,platform:'Google',historic:i===24,showResponse:i===24,response:i===24?'Published response':'',url:'https://example.com/review/'+(i+1),topics:[]}));
 const listeners=new Set(),data={records:all.slice(0,20),total:85,average:5,indexReady:true,filterIndex:all,
  get hasMore(){return this.records.length<all.length;},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  loadIndex:async()=>all,
  async fetchRecords(ids){fetches++;if(fetchDeferred)await new Promise(resolve=>resolveFetch=resolve);return ids.map(id=>all.find(r=>r.id===id));},
  async loadMore(){loads++;this.records.push(...all.slice(this.records.length,this.records.length+20));listeners.forEach(fn=>fn());}
 };
 w.ResizeObserver=class{observe(){}disconnect(){}};
 w.Element.prototype.animate=function(){return{finished:Promise.resolve(),cancel(){},finish(){}};};
 w.Element.prototype.getAnimations=()=>[];
 const reduced=new w.EventTarget();reduced.matches=false;
 w.TDBMotion={reduced,defaults:{fadeIn:0,fadeOut:0},reviews:{easing:'ease',fade:0,openDelay:0,nextDelay:0,previousDelay:0,cardDelay:0},duration:()=>500,
  fadeController:()=>({to(node,opacity){node.style.opacity=opacity;},destroy(){}}),filterToggle:()=>({set(){},destroy(){}})};
 w.TDBNativeTicker={mount:node=>({update(value){node.textContent=value;},settle(){},destroy(){}})};
 w.TDBReviewCMS={contextForPath:()=>'',canonicalTopic:x=>x,matching:records=>records,ordered:records=>records.slice().reverse(),sourceIcon(){const holder=w.document.createElement('span');holder.innerHTML='<svg><rect/></svg>';return holder;}};
 w.TDBDrawerReading={mount:()=>({scroll:()=>swiper?.slides[swiper.activeIndex]?.querySelector('[data-tdb-review-scroll]')||root.querySelector('[data-tdb-review-scroll]'),capture(){},apply(){},clear(){},bind(){},setMode(){},destroy(){}})};
 w.TDBCarouselVisibility={bind(){}};
 w.TDBCarouselControls={bind({previous,next,navigate,signal,enabled}){previous.addEventListener('click',()=>{if(enabled())navigate(-1);},{signal});next.addEventListener('click',()=>{if(enabled())navigate(1);},{signal});}};
 w.TDBSwiper={register(){},onSettled(s,fn){settled=fn;},create(el,params){swiper={params,slides:[],activeIndex:params.initialSlide,animating:false,
  get isBeginning(){return this.activeIndex===0;},get isEnd(){return this.activeIndex===this.slides.length-1;},
  update(){this.slides=[...track.children];},init(){this.update();},destroy(){},
  slideTo(i){this.activeIndex=i;params.on.slideChange();},slideNext(){this.slideTo(this.activeIndex+1);},slidePrev(){this.slideTo(this.activeIndex-1);}};return swiper;}};
 w.TDBDrawer={mount(el,options){drawerOptions=options;return{state:'closed',async open(){this.state='opening';options.onOpen();this.state='open';},async close(){this.state='closing';options.onClose();this.state='closed';},destroy(){}};}};
 w.TDBFilters={mount(el,options){filterOptions=options;return{setCount(){},collapseAll(){},reset(){options.onChange(false,true);},destroy(){},requestClose(){}};}};
 w.eval(source);const api=w.TDBReviews.mount(root,data);
 return {w,root,track,data,all,api,get swiper(){return swiper;},get fetches(){return fetches;},get loads(){return loads;},
  notify(){listeners.forEach(fn=>fn());},settle(){swiper.animating=false;settled('programmatic');},
  deferFetch(){fetchDeferred=true;},finishFetch(){fetchDeferred=false;resolveFetch();},
  async filterRecent(){filterOptions.onChange(true);root.querySelector('[data-tdb-filter-group="sort"][data-tdb-filter-value="recent"]').click();await filterOptions.beforeClose();filterOptions.onChange(false);},
  dispose(){api.destroy();w.close();},listeners};
}

test('shared card prefetch preserves the warm closed drawer; opening selects a newly cached identity',async()=>{
 const h=setup();try{
  assert.equal(h.track.children.length,20);const before=h.root.querySelectorAll('*').length;
  await h.data.loadMore();assert.equal(h.data.records.length,40);assert.equal(h.track.children.length,20);assert.equal(h.root.querySelectorAll('*').length,before);
  await h.api.open(null,'r25');await drain();assert.equal(h.track.children.length,40);assert.equal(h.swiper.activeIndex,24);
  const active=h.swiper.slides[24];assert.equal(active.querySelector('[data-review-render="name"]').textContent,'Reviewer 25');assert.equal(active.querySelector('[data-review-render="historic"]').hidden,false);assert.equal(active.querySelector('[data-review-render="response"]').textContent,'Published response');
  await h.api.close();const closed=h.root.querySelectorAll('*').length;await h.data.loadMore();h.notify();assert.equal(h.root.querySelectorAll('*').length,closed);
  await h.api.open(null,'r45');await drain();assert.equal(h.track.children.length,60);assert.equal(h.swiper.activeIndex,44);assert.equal(new Set([...h.track.children].map(n=>n.dataset.tdbReviewId)).size,60);
  h.root.querySelector('[data-tdb-reviews-prev]').click();assert.equal(h.swiper.activeIndex,43);h.root.querySelector('[data-tdb-reviews-next]').click();assert.equal(h.swiper.activeIndex,44);
 }finally{h.dispose();}
});
test('open drawer still appends shared results, with motion settlement protecting the track',async()=>{
 const h=setup();try{await h.api.open(null,'r2');h.swiper.animating=true;await h.data.loadMore();assert.equal(h.track.children.length,20);h.settle();assert.equal(h.track.children.length,40);assert.equal(h.swiper.activeIndex,1);h.settle();assert.equal(h.track.children.length,40);}finally{h.dispose();}
});
test('closing during a pending append keeps the track stable until reopening',async()=>{
 const h=setup();try{await h.api.open(null,'r2');h.swiper.animating=true;await h.data.loadMore();await h.api.close();h.settle();assert.equal(h.track.children.length,20);await h.api.open(null,'r25');assert.equal(h.track.children.length,40);assert.equal(h.swiper.activeIndex,24);}finally{h.dispose();}
});
test('filtered continuation completing after close waits and preserves the selected ordering',async()=>{
 const h=setup();try{
  await h.api.open(null,'r2');await h.filterRecent();assert.equal(h.track.children[0].dataset.tdbReviewId,'r85');
  h.deferFetch();h.swiper.slideTo(14);await drain();assert.equal(h.fetches,2);
  await h.api.close();h.finishFetch();await drain();assert.equal(h.track.children.length,20);
  await h.data.loadMore();assert.equal(h.track.children.length,20,'unfiltered card prefetch cannot mix into the filtered drawer');
  await h.api.open();await drain();assert.equal(h.track.children.length,40);assert.equal(h.track.children[20].dataset.tdbReviewId,'r65');
  await h.api.close();await h.api.open(null,'r35');await drain();assert.equal(h.swiper.slides[h.swiper.activeIndex].dataset.tdbReviewId,'r35','named quote clears the prior filter');
 }finally{h.dispose();}
});
test('destroy unsubscribes and releases pending records without rebuilding DOM',async()=>{
 const h=setup();await h.data.loadMore();h.api.destroy();assert.equal(h.listeners.size,0);assert.equal(h.track.children.length,0);await h.data.loadMore();assert.equal(h.track.children.length,0);h.w.close();
});
