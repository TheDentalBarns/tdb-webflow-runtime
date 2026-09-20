const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.TDB_BANNER_FILE || require('node:path').resolve(__dirname,'../../src/banner/announcement.js'),'utf8');
const fieldValues={'slug':'active','smile-release-time':'September 25, 2026','smile-release-uk-time':'09:00','next-signature-slot':'September 22, 2026','next-signature-uk-time':'09:30','smile-countdown-text':'Smile Design · Complimentary appointments released in','signature-heading':'Signature Assessment ✦ Next appointment','smile-booked-title':'Smile Design · Fully booked','smile-waitlist-text':'Join the waitlist','signature-availability-text':'Appointments available'};
const values=fields=>Object.entries(fields).map(([k,v])=>`<div data-banner-field="${k}">${v}</div>`).join('');
function setup({path='/',embedded=true,saved=true,mobile=false,reduced=false,animationDelay=400,fields=fieldValues,failures=0,uiReady=true,invalid=false}={}){
 const dom=new JSDOM('<!doctype html><html><head><style>:root{--tdb-ui-ready:1}</style></head><body>'+(embedded?'<div data-tdb-banner-item>'+values(fields)+'</div>':'')+'<div id="tdb-vip-drawer"><button class="tdb-vip-drawer-handle"></button></div><div id="tdb-elfsight-timer-shell" class="tdb-elfsight-shell"></div></body></html>',{url:'https://dentalbarns.webflow.io'+path,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;let clock=Date.parse('2026-09-19T11:00:00Z'),id=0,calls=0;const tasks=new Map();
 w.Date.now=()=>clock;w.performance.now=()=>clock;w.matchMedia=q=>({matches:q.includes('reduced-motion')?reduced:mobile&&q.includes('767')});
 w.setTimeout=(fn,ms)=>{const n=++id;tasks.set(n,{fn,at:clock+ms});return n};w.clearTimeout=n=>tasks.delete(n);
 w.requestAnimationFrame=fn=>w.setTimeout(fn,16);
 w.HTMLElement.prototype.animate=function(){const animation={onfinish:null,oncancel:null,cancel(){w.clearTimeout(handle);this.oncancel?.()}};const handle=w.setTimeout(()=>animation.onfinish?.(),animationDelay);return animation;};
 w.fetch=async()=>{calls++;if(calls<=failures)throw Error('offline');return {ok:true,text:async()=>invalid?'<html>error page</html>':values(fields)}};
 if(saved)d.cookie='CookieScriptConsent='+encodeURIComponent('{"action":"reject"}');
 function tick(ms){const end=clock+ms;let n=0;while(true){const first=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!first||first[1].at>end)break;if(++n>10000)throw Error('loop');clock=first[1].at;tasks.delete(first[0]);first[1].fn();}clock=end}
 const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve()};
 if(!uiReady)d.querySelector('style').textContent=':root{--tdb-ui-ready:0}';
 w.eval(source);w.TDBAnnouncement.mount(d.getElementById('tdb-elfsight-timer-shell'));
 return {w,d,tick,flush,calls:()=>calls,close:()=>w.close()};
}
(async()=>{
 let a=setup({mobile:true});assert.equal(a.calls(),0,'embedded CMS has zero data requests');assert.equal(a.d.querySelector('#tdb-elfsight-timer-shell').hidden,true,'never paints while pending');a.tick(550);
 assert.equal(a.w.TDBAnnouncement.status().deadline,'2026-09-25T08:00:00.000Z','UK 09:00 maps to BST UTC08');assert.equal(a.w.TDBAnnouncement.status().mode,'countdown');
 assert.equal(a.d.querySelector('.tdb-announcement-pause'),null,'pause control removed');
 const track=a.d.querySelector('.tdb-announcement-track');
 const progress=a.d.querySelector('.tdb-announcement-progress');
 a.tick(3000);a.d.querySelector('#tdb-elfsight-timer-shell').dispatchEvent(new a.w.Event('mouseenter'));
 const held=Number(progress.style.strokeDashoffset);assert.ok(held>.60&&held<.64,'progress retains the unelapsed portion when paused');
 a.tick(10000);assert.equal(track.firstElementChild.dataset.message,'smile','reading pause holds message and progress together');
 a.d.querySelector('#tdb-elfsight-timer-shell').dispatchEvent(new a.w.Event('mouseleave'));
 assert.ok(parseFloat(progress.style.transition.split(' ')[1])<5100,'resume uses remaining dwell, not a new interval');
 a.tick(4990);assert.equal(track.style.transform,'translateX(-100%)','message travels left');a.tick(450);assert.equal(a.w.TDBAnnouncement.status().mode,'signature');assert.equal(track.firstElementChild.dataset.message,'signature');assert.equal(track.style.transform,'translateX(0)');
 assert.equal(a.d.querySelector('[data-message="signature"] .tdb-announcement-title').textContent,'Signature Assessment ✦ Next appointment','CMS title is used verbatim');assert.equal(a.d.querySelector('[data-message="signature"] .tdb-announcement-lower').textContent,'Tue 22 Sept · 09:30');
 a.tick(8450);assert.equal(a.w.TDBAnnouncement.status().mode,'countdown');assert.equal(track.firstElementChild.dataset.message,'smile','loop also travels left');
 a.d.querySelector('#tdb-elfsight-timer-shell').dispatchEvent(new a.w.Event('mouseenter'));a.tick(9000);assert.equal(a.w.TDBAnnouncement.status().mode,'countdown','reading hover pauses rotation');
 let opens=0;a.d.querySelector('.tdb-vip-drawer-handle').addEventListener('click',()=>opens++);a.d.querySelector('.tdb-announcement').click();assert.equal(opens,1,'main mobile action retained');
 a.w.TDBAnnouncement.configure({deadline:null,bookedTitle:'Custom CMS booked heading',rest:'Custom CMS waitlist action'});assert.equal(a.d.querySelector('[data-message="smile"] .tdb-announcement-title').textContent,'Custom CMS booked heading');assert.equal(a.d.querySelector('.tdb-announcement-action').textContent,'Custom CMS waitlist action');
 a.d.documentElement.classList.add('tdb-slider-focus');await a.flush();assert.equal(a.w.TDBAnnouncement.status().ticking,false);assert.equal(a.d.querySelector('.tdb-announcement').tabIndex,-1);a.close();
 a=setup({mobile:true});a.tick(550);
 const control=a.d.querySelector('.tdb-announcement'), rail=a.d.querySelector('.tdb-announcement-track');
 rail.getBoundingClientRect=()=>({width:300});
 let swipeOpens=0;a.d.querySelector('.tdb-vip-drawer-handle').addEventListener('click',()=>swipeOpens++);
 const pointer=(type,x,y=30)=>{const e=new a.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true}});control.dispatchEvent(e);};
 assert.equal(a.d.querySelector('.tdb-announcement-clock'),null,'only the arrow circle remains');
 assert.ok(a.d.querySelector('.tdb-announcement-circle .tdb-announcement-progress'),'progress belongs to the arrow');
 pointer('pointerdown',250);pointer('pointermove',180);const childCapture=new a.w.Event('lostpointercapture',{bubbles:true});Object.defineProperty(childCapture,'pointerId',{value:1});rail.firstElementChild.dispatchEvent(childCapture);assert.equal(rail.style.transform,'translateX(-70px)','message follows left drag');pointer('pointerup',180);control.click();assert.equal(swipeOpens,0,'swipe synthetic click does not open VIP');a.tick(450);
 assert.equal(control.dataset.mode,'signature');assert.equal(control.dataset.rotation,'manual');a.tick(25000);assert.equal(control.dataset.mode,'signature','manual choice stops auto rotation');
 pointer('pointerdown',100);pointer('pointermove',180);assert.equal(rail.style.transform,'translateX(-220px)','message follows right drag');pointer('pointerup',180);control.click();a.tick(450);assert.equal(control.dataset.mode,'countdown');assert.equal(swipeOpens,0);
 const beforeSeconds=a.d.querySelectorAll('.tdb-announcement-value')[3].textContent;a.tick(2000);assert.notEqual(a.d.querySelectorAll('.tdb-announcement-value')[3].textContent,beforeSeconds,'real deadline continues after manual swipe');
 pointer('pointerdown',200);pointer('pointerup',200);control.click();assert.equal(swipeOpens,1,'subsequent deliberate tap still opens VIP');
 a.close();
 a=setup();a.tick(550);const b=a.d.querySelector('.tdb-announcement');b.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));a.tick(450);assert.equal(b.dataset.mode,'signature');assert.equal(b.dataset.rotation,'manual','keyboard navigation also stops rotation');a.close();
 a=setup({mobile:true,reduced:true});a.tick(550);
 const reducedButton=a.d.querySelector('.tdb-announcement'),reducedRail=a.d.querySelector('.tdb-announcement-track');reducedRail.getBoundingClientRect=()=>({width:300});
 for(const [type,x] of [['pointerdown',250],['pointermove',170]]){const e=new a.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:20,button:0});Object.defineProperties(e,{pointerId:{value:7},isPrimary:{value:true}});reducedButton.dispatchEvent(e);}
 assert.equal(reducedRail.style.transform,'translateX(-80px)','reduced motion still follows direct finger movement');
 const up=new a.w.MouseEvent('pointerup',{bubbles:true,clientX:170,clientY:20,button:0});Object.defineProperties(up,{pointerId:{value:7},isPrimary:{value:true}});reducedButton.dispatchEvent(up);assert.equal(reducedButton.dataset.mode,'signature','reduced-motion swipe settles immediately and correctly');a.close();
 a=setup({animationDelay:900});a.tick(8540);a.tick(450);assert.equal(a.d.querySelector('.tdb-announcement-track').firstElementChild.dataset.message,'smile','slow animation is not prematurely reordered by a fixed timer');a.tick(450);assert.equal(a.d.querySelector('.tdb-announcement-track').firstElementChild.dataset.message,'signature','settlement follows actual animation finish');a.close();
 a=setup({path:'/services/fast-track'});a.tick(550);assert.equal(a.w.TDBAnnouncement.status().mode,'signature');assert.equal(a.d.querySelector('.tdb-announcement-track').children.length,1);a.tick(20000);assert.equal(a.w.TDBAnnouncement.status().mode,'signature');a.w.dispatchEvent(new a.w.Event('pagehide'));assert.equal(a.w.TDBAnnouncement.status().ticking,false);a.close();
 a=setup({embedded:false,saved:false});assert.equal(a.calls(),0,'no settings read before consent');a.w.dispatchEvent(new a.w.Event('CookieScriptReject'));assert.equal(a.calls(),1);a.w.dispatchEvent(new a.w.Event('CookieScriptAccept'));assert.equal(a.w.TDBAnnouncement.status().mounted,false,'duplicate consent does not paint fallback during read');await a.flush();a.tick(550);assert.equal(a.calls(),1);assert.equal(a.w.TDBAnnouncement.status().mode,'countdown');a.close();
 a=setup({fields:{...fieldValues,'smile-release-time':'March 28, 2027','smile-release-uk-time':'01:30'}});assert.equal(a.w.TDBAnnouncement.status().deadline,null,'nonexistent UK spring-forward time rejected');a.close();

 // Network failures must never manufacture availability, and recover without a reload.
 a=setup({embedded:false,failures:1});await a.flush();a.tick(550);
 assert.equal(a.w.TDBAnnouncement.status().settings,'unavailable');
 assert.equal(a.d.querySelector('[data-message="signature"] .tdb-announcement-lower').textContent,'Enquire about appointments');
 assert.equal(a.d.querySelector('[data-message="smile"] .tdb-announcement-title').textContent,'Smile Design');
 a.tick(750);await a.flush();assert.equal(a.calls(),2);assert.equal(a.w.TDBAnnouncement.status().settings,'ready');
 assert.equal(a.d.querySelector('[data-message="signature"] .tdb-announcement-lower').textContent,'Tue 22 Sept · 09:30');a.close();
 a=setup({embedded:false,failures:10});await a.flush();a.tick(800);await a.flush();a.tick(60000);assert.equal(a.calls(),2,'automatic retries are bounded');
 a.w.dispatchEvent(new a.w.Event('online'));await a.flush();a.w.dispatchEvent(new a.w.Event('online'));await a.flush();assert.equal(a.calls(),3,'connection recovery also bounded');a.close();
 a=setup({embedded:false,invalid:true});await a.flush();assert.equal(a.w.TDBAnnouncement.status().settings,'unavailable');assert.equal(a.w.TDBAnnouncement.status().cms,false,'HTTP 200 error pages are rejected');a.close();
 a=setup({embedded:false,fields:{...fieldValues,slug:'preview'}});await a.flush();assert.equal(a.w.TDBAnnouncement.status().settings,'unavailable','wrong CMS target rejected');a.close();
 a=setup({embedded:false,fields:{...fieldValues,'next-signature-uk-time':''}});await a.flush();assert.equal(a.w.TDBAnnouncement.status().settings,'unavailable','partial appointment date is rejected');a.close();
 // Reproduce the capture-before-target stylesheet load sequence from the live page.
 a=setup({uiReady:false});a.tick(550);const css=a.d.createElement('link');a.d.head.append(css);
 css.addEventListener('load',()=>{a.d.querySelector('style').textContent=':root{--tdb-ui-ready:1}'});css.dispatchEvent(new a.w.Event('load'));a.tick(100);
 assert.equal(a.d.querySelector('#tdb-elfsight-timer-shell').hidden,false);assert.equal(a.d.querySelector('#tdb-elfsight-timer-shell').hasAttribute('data-tdb-announcement-pending'),false);a.close();
 a=setup({uiReady:false});let uiCalls=0; a.w.TDBFeatureCSS={ui:async()=>{uiCalls++;a.d.querySelector('style').textContent=':root{--tdb-ui-ready:1}'}};
 a.tick(550);await a.flush();a.tick(50);assert.equal(uiCalls,1,'shared CSS readiness used');assert.equal(a.d.querySelector('#tdb-elfsight-timer-shell').hidden,false);a.close();
 // Cancellation unlocks and settles exactly once in either direction.
 for(const direction of ['ArrowLeft','ArrowRight']){
   a=setup();a.tick(550);let animation;const animate=a.w.HTMLElement.prototype.animate;a.w.HTMLElement.prototype.animate=function(...args){return animation=animate.apply(this,args)};
   const b=a.d.querySelector('.tdb-announcement');b.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:direction,bubbles:true}));animation.cancel();a.tick(1000);
   assert.equal(b.dataset.mode,'signature');assert.equal(a.d.querySelector('.tdb-announcement-track').style.transform,'translateX(0)');
   b.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:direction,bubbles:true}));a.tick(450);assert.equal(b.dataset.mode,'countdown','swipe can continue after cancellation');a.close();
 }
 a=setup();a.tick(550);a.w.HTMLElement.prototype.animate=()=>{throw Error('animation unavailable')};
 a.d.querySelector('.tdb-announcement').dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));a.tick(500);assert.equal(a.w.TDBAnnouncement.status().mode,'signature','CSS fallback handles animation setup errors');a.close();
 // A fresh tap must work even while the preceding swipe is still settling.
 for(const direction of [-1,1])for(const [delay,animationDelay] of [[100,400],[450,400],[500,900]]){
   a=setup({mobile:true,animationDelay});a.tick(550);
   const b=a.d.querySelector('.tdb-announcement'),track=a.d.querySelector('.tdb-announcement-track');
   track.getBoundingClientRect=()=>({width:300});let opened=0;
   a.d.querySelector('.tdb-vip-drawer-handle').addEventListener('click',()=>opened++);
   const pointer=(type,x)=>{const e=new a.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:30,button:0});Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true}});b.dispatchEvent(e)};
   pointer('pointerdown',150);pointer('pointermove',150+direction*80);pointer('pointerup',150+direction*80);b.click();assert.equal(opened,0,'swipe-generated click stays suppressed');
   a.tick(delay);pointer('pointerdown',220);pointer('pointerup',220);b.click();assert.equal(opened,1,'first fresh tap opens VIP during/after slide settlement');
   a.tick(1000);assert.equal(b.dataset.mode,'signature','interrupted slide settles exactly once');a.close();
 }
 // A real touch tap should not depend on a later compatibility click being delivered.
 for(const direction of [-1,1]){
   a=setup({mobile:true});a.tick(550);let opened=0;
   const b=a.d.querySelector('.tdb-announcement'),track=a.d.querySelector('.tdb-announcement-track');
   b.getBoundingClientRect=()=>({left:0,right:300,top:0,bottom:90});track.getBoundingClientRect=()=>({width:300});
   a.d.querySelector('.tdb-vip-drawer-handle').addEventListener('click',()=>opened++);
   const pointer=(type,x,y=30)=>{const e=new a.w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperties(e,{pointerId:{value:7},isPrimary:{value:true},pointerType:{value:'touch'}});b.dispatchEvent(e)};
   pointer('pointerdown',150);pointer('pointermove',150+direction*80);pointer('pointerup',150+direction*80);b.click();assert.equal(opened,0,'touch swipe never opens drawer');
   a.tick(100);pointer('pointerdown',250);pointer('pointerup',250);
   assert.equal(opened,1,'first touch tap opens without a compatibility click in either direction');
   b.click();assert.equal(opened,1,'compatibility click cannot toggle drawer twice');
   pointer('pointerdown',250);pointer('pointerup',320);b.click();assert.equal(opened,1,'release outside button does not activate');
   pointer('pointerdown',200);pointer('pointermove',200,70);pointer('pointerup',200,70);b.click();assert.equal(opened,1,'vertical scroll does not activate');
   a.close();
 }
 // Filled animation must be released only after the final DOM/order is prepared.
 for(const direction of ['ArrowLeft','ArrowRight']){
   a=setup();a.tick(550);let released;
   const animate=a.w.HTMLElement.prototype.animate;
   a.w.HTMLElement.prototype.animate=function(...args){const track=this,animation=animate.apply(this,args),cancel=animation.cancel;animation.cancel=function(){released={transform:track.style.transform,message:track.firstElementChild.dataset.message};cancel.call(this)};return animation};
   a.d.querySelector('.tdb-announcement').dispatchEvent(new a.w.KeyboardEvent('keydown',{key:direction,bubbles:true}));a.tick(450);
   assert.deepEqual(released,{transform:'translateX(0)',message:'signature'},'settled slide is ready before compositor release');a.close();
 }
 // Unrelated root classes do not rewrite the banner; date formatters are reused.
 a=setup();a.tick(550);let writes=0,formats=0;const button=a.d.querySelector('.tdb-announcement');const original=button.setAttribute;
 button.setAttribute=function(...args){writes++;return original.apply(this,args)};const IntlFormatter=a.w.Intl.DateTimeFormat;a.w.Intl.DateTimeFormat=function(...args){formats++;return new IntlFormatter(...args)};
 a.d.documentElement.classList.add('unrelated-page-state');await a.flush();assert.equal(writes,0);a.tick(2500);assert.equal(formats,0,'countdown reuses existing formatters');assert.equal(writes,0,'unchanged labels are not rewritten');a.close();
 console.log('PASS: banner existing behaviour, settings validation/recovery, bounded retries, stylesheet ordering, cancelled animations, CSS fallback and render efficiency.');
})().catch(e=>{console.error(e);process.exitCode=1});
