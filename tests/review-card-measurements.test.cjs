const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require(process.env.TDB_JSDOM_PATH||'jsdom');
const source=fs.readFileSync(path.join(__dirname,'../src/reviews/native/cards.js'),'utf8');
const card=i=>`<article class="tdb-review-cards_slide" data-review-id="r-${i}"><span data-cards-render="name">Reviewer ${i}</span><blockquote data-cards-render="excerpt">Excerpt ${i}</blockquote><div data-cards-render="text" style="line-height:20px">Body ${i}</div><span data-cards-render="date">17 July 2024</span><span data-cards-render="rating"></span><a data-tdb-cards-open>Read more</a></article>`;
test('appends measure only new bodies; a resize during movement is applied on settle',async()=>{
 const dom=new JSDOM(`<section data-tdb-review-cards><div data-tdb-cards-viewport style="padding-left:0px;padding-right:0px"><div data-tdb-cards-track>${Array.from({length:8},(_,i)=>card(i+1)).join('')}</div></div><p data-tdb-cards-status></p><nav data-tdb-cards-navigation><span data-tdb-cards-current></span><span data-tdb-cards-total></span><a data-tdb-cards-prev></a><a data-tdb-cards-next></a><span data-tdb-cards-progress><span></span></span></nav></section>`,{url:'https://fixture.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,root=w.document.querySelector('section'),track=root.querySelector('[data-tdb-cards-track]'),viewport=root.querySelector('[data-tdb-cards-viewport]');
 const measurements=new Map(),resizes=[];let bodyHeight=125,swiper,settled,opened;
 class Observer{constructor(fn){this.fn=fn;}observe(){}disconnect(){this.disconnected=true;}}
 w.IntersectionObserver=Observer;w.ResizeObserver=class extends Observer{constructor(fn){super(fn);resizes.push(this);}};
 w.HTMLElement.prototype.getBoundingClientRect=function(){
  if(this.matches('[data-cards-render="text"]')){measurements.set(this,(measurements.get(this)||0)+1);return {left:0,right:200,width:200,height:bodyHeight};}
  if(this.matches('.tdb-review-cards_slide')){const left=([...track.children].indexOf(this)-(swiper?.activeIndex||0))*210;return {left,right:left+200,width:200,height:500};}
  return {left:0,right:600,width:600,height:500};
 };
 Object.defineProperty(viewport,'clientWidth',{get:()=>600});Object.defineProperty(root.querySelector('[data-tdb-cards-progress]'),'clientWidth',{get:()=>300});
 const reduced=new w.EventTarget();reduced.matches=false;
 w.TDBMotion={reduced,reviews:{easing:'ease',fade:0,initialDelay:0,nextDelay:0,previousDelay:0,cardDelay:0},carousel:{entryStart:0},duration:()=>420,fadeController:()=>({to(n,v){if(n)n.style.opacity=v;},destroy(){}})};
 w.TDBReviewCMS={contextForPath:()=> 'default'};w.TDBNativeTicker={mount:()=>({update(){},settle(){},destroy(){}})};
 w.TDBRenderedProgress={observe:()=>({schedule(){},pause(){},destroy(){}})};
 w.eval(fs.readFileSync(path.join(__dirname,'../dist/tdb-swiper-8.4.7.min.js'),'utf8'));const firstView=w.TDBSwiper.firstView;
 w.TDBSwiper={firstView,register(){},onSettled(s,fn){settled=fn;return()=>{};},create(el,params){swiper={params,activeIndex:0,slides:[],animating:false,allowClick:true,touchEventsData:{isTouched:false},init(){this.update();},update(){this.slides=[...track.children];},slideTo(i){this.activeIndex=i;params.on.slideChange();settled('programmatic');},destroy(){}};return swiper;}};
 w.eval(fs.readFileSync(path.join(__dirname,'../dist/tdb-modules.js'),'utf8'));
 w.eval(source);
 const records=Array.from({length:32},(_,i)=>({id:`r-${i+1}`,name:`Reviewer ${i+1}`,excerpt:`Excerpt ${i+1}`,text:`Body ${i+1}`,displayDate:'17 July 2024',rating:5,platform:'Google',excerpts:{}}));
 const api=w.TDBReviewCards.mount(root,{records,total:32,hasMore:false},{openReviews:async args=>{opened=args.reviewId;}});
 const initial=[...root.querySelectorAll('[data-cards-render="text"]')],next=root.querySelector('[data-tdb-cards-next]');
 const drain=()=>new Promise(resolve=>setImmediate(resolve));
 try{
  assert(initial.every(n=>measurements.get(n)===1));
  for(let i=0;i<4;i++){next.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await drain();}
  assert.equal(track.children.length,16);assert(initial.every(n=>measurements.get(n)===1));assert.equal([...measurements.values()].reduce((a,b)=>a+b,0),16);
  const active=track.children[4];active.querySelector('[data-tdb-cards-open]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await drain();assert.equal(opened,'r-5');
  swiper.animating=true;bodyHeight=145;resizes[0].fn();assert(initial.every(n=>measurements.get(n)===1));
  swiper.animating=false;settled('programmatic');assert(initial.every(n=>measurements.get(n)===2));assert([...root.querySelectorAll('.tdb-review-cards_body-preview')].every(n=>n.style.maxHeight==='140px'));
  api.destroy();assert.equal(track.children.length,8);assert.equal(root.querySelectorAll('.tdb-review-cards_body-preview').length,0);assert(resizes[0].disconnected);
 }finally{dom.window.close();}
});
