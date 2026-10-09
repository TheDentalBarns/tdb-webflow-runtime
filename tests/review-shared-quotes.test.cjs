const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
async function setup(count=3){
 const dom=new JSDOM(`<div data-tdb-review-quotes><div data-tdb-team-viewport><div class="tdb-team-quotes_track" data-tdb-team-track>${[0,1,2].map(i=>`<div class="tdb-team-quotes_slide" data-tdb-team-slide><div data-tdb-team-content data-tdb-quote-action role="button"><p data-tdb-team-text>Fallback ${i}</p><div data-tdb-team-author-line><span data-tdb-quotes-source></span><span data-tdb-quotes-name>Author</span></div></div></div>`).join('')}</div></div><div data-tdb-team-position><span data-tdb-team-current>01</span><span data-tdb-team-total>03</span></div></div>`,{url:'https://dentalbarns.webflow.io',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,root=w.document.querySelector('[data-tdb-review-quotes]'),viewport=root.querySelector('[data-tdb-team-viewport]'),calls=[];
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 viewport.getBoundingClientRect=()=>({width:393,height:300,top:0,left:0,right:393,bottom:300});Object.defineProperty(viewport,'clientWidth',{value:393});
 w.TDBMotion={duration:()=>400,carousel:{entryStart:100,nextDelay:0,previousDelay:0,settleDelay:0},ddText:()=>({enter(){},destroy(){}})};
 w.TDBNativeTicker={mount:n=>({update:v=>n.textContent=v,destroy(){}})};
 w.TDBModules={load:async()=>{}};w.TDBReviewCMS={sourceIcon(){throw Error('Trio must not clone logo artwork')}};
 const template=w.document.createElement('div');template.innerHTML='<span data-tdb-review-icon="Google"><svg><image href="https://example.com/shared-google.svg"></image></svg></span>';w.document.body.append(template);
 Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/tdb-quote-carousel.js'}});
 w.eval(read('dist/tdb-swiper-8.4.7.min.js'));w.eval(read('dist/tdb-quote-carousel.js'));w.eval(read('dist/tdb-review-quote-adapter.min.js'));
 const data={featured:Array.from({length:count},(_,i)=>'review-'+i),records:Array.from({length:count},(_,i)=>({id:'review-'+i,excerpt:'Published '+i,name:'Reviewer '+i,platform:'Google'}))};
 const cached=new Map(data.records.map(record=>[record.id,record]));data.getCached=id=>cached.get(id);data.records=data.records.slice(0,1);
 const hooks={openReviews:async value=>{calls.push(value)}};let api=w.TDBReviewQuotes.mount(root,data,hooks);
 const click=()=>api.swiper.slides[api.swiper.activeIndex].querySelector('[data-tdb-quote-action]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
 const flush=()=>new Promise(r=>setTimeout(r,10));
 return{w,root,viewport,data,hooks,calls,get api(){return api},click,flush,remount(){api=w.TDBReviewQuotes.mount(root,data,hooks)},close(){api.destroy();w.close()}};
}
test('native review root and authored cards survive hydration, selected review opens through shared action',async()=>{
 const t=await setup();try{assert.equal(t.w.document.querySelector('[data-tdb-review-quotes]'),t.root);assert.equal(t.root.querySelectorAll('[data-tdb-team-slide]:not(.swiper-slide-duplicate)').length,3);
 for(let i=0;i<8;i++){t.api.swiper.slideNext(0);await t.flush();t.click();await t.flush();assert.equal(t.calls.at(-1).reviewId,'review-'+t.api.swiper.realIndex)}
 assert.equal(t.root.querySelector('[data-tdb-team-total]').textContent,'03');
 assert.equal(t.data.records.length,1,'targeted records do not advance the shared feed');
 for(const source of t.root.querySelectorAll('[data-tdb-quotes-source]')){assert.equal(source.children.length,0);assert.equal(source.dataset.reviewPlatform,'Google');assert.match(source.style.backgroundImage,/shared-google\.svg/)}
 }finally{t.close()}
});
test('swipes and inactive duplicates cannot open drawer; keyboard opens active review once',async()=>{
 const t=await setup();try{t.api.swiper.allowClick=false;t.click();await t.flush();assert.equal(t.calls.length,0);t.api.swiper.allowClick=true;
 const inactive=[...t.api.swiper.slides].find((_,i)=>i!==t.api.swiper.activeIndex);inactive.querySelector('[data-tdb-quote-action]').click();await t.flush();assert.equal(t.calls.length,0);
 const trigger=t.api.swiper.slides[t.api.swiper.activeIndex].querySelector('[data-tdb-quote-action]');trigger.dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));trigger.click();await t.flush();assert.equal(t.calls.length,1);
 }finally{t.close()}
});
test('consent teardown/remount keeps native content and removes stale event handlers',async()=>{
 const t=await setup();try{t.click();await t.flush();t.api.destroy();assert.equal(t.root.querySelectorAll('[data-tdb-team-slide]').length,3);assert.equal(t.root.querySelector('[data-tdb-quote-action]').getAttribute('aria-disabled'),'true');t.root.querySelector('[data-tdb-quote-action]').click();await t.flush();assert.equal(t.calls.length,1);t.remount();t.click();await t.flush();assert.equal(t.calls.length,2)}finally{t.close()}
});
test('one CMS review has no looping copies and hides the counter',async()=>{
 const t=await setup(1);try{assert.equal(t.api.swiper.params.loop,false);assert.equal(t.root.querySelectorAll('[data-tdb-team-slide]').length,1);assert(t.root.querySelector('[data-tdb-team-position]').classList.contains('is-hidden'));t.click();await t.flush();assert.equal(t.calls[0].reviewId,'review-0')}finally{t.close()}
});
