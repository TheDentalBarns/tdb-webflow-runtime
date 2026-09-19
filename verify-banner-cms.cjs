const {JSDOM}=require('/tmp/tdb-banner-tools/node_modules/jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/banner/announcement.js','utf8');
const fieldValues={'slug':'active','smile-release-time':'September 25, 2026','smile-release-uk-time':'09:00','next-signature-slot':'September 22, 2026','next-signature-uk-time':'09:30','smile-countdown-text':'Smile Design · Complimentary appointments released in','signature-heading':'Signature Assessment ✦ Next appointment','smile-booked-title':'Smile Design · Fully booked','smile-waitlist-text':'Join the waitlist'};
const values=fields=>Object.entries(fields).map(([k,v])=>`<div data-banner-field="${k}">${v}</div>`).join('');
function setup({path='/',embedded=true,saved=true,mobile=false,fields=fieldValues}={}){
 const dom=new JSDOM('<!doctype html><html><head><style>:root{--tdb-ui-ready:1}</style></head><body>'+(embedded?'<div data-tdb-banner-item>'+values(fields)+'</div>':'')+'<div id="tdb-vip-drawer"><button class="tdb-vip-drawer-handle"></button></div><div id="tdb-elfsight-timer-shell" class="tdb-elfsight-shell"></div></body></html>',{url:'https://dentalbarns.webflow.io'+path,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;let clock=Date.parse('2026-09-19T11:00:00Z'),id=0,calls=0;const tasks=new Map();
 w.Date.now=()=>clock;w.performance.now=()=>clock;w.matchMedia=q=>({matches:mobile&&q.includes('767')});
 w.setTimeout=(fn,ms)=>{const n=++id;tasks.set(n,{fn,at:clock+ms});return n};w.clearTimeout=n=>tasks.delete(n);
 w.requestAnimationFrame=fn=>w.setTimeout(fn,16);
 w.fetch=async()=>{calls++;return {ok:true,text:async()=>values(fields)}};
 if(saved)d.cookie='CookieScriptConsent='+encodeURIComponent('{"action":"reject"}');
 function tick(ms){const end=clock+ms;let n=0;while(true){const first=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!first||first[1].at>end)break;if(++n>10000)throw Error('loop');clock=first[1].at;tasks.delete(first[0]);first[1].fn();}clock=end}
 const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve()};
 w.eval(source);w.TDBAnnouncement.mount(d.getElementById('tdb-elfsight-timer-shell'));
 return {w,d,tick,flush,calls:()=>calls,close:()=>w.close()};
}
(async()=>{
 let a=setup({mobile:true});assert.equal(a.calls(),0,'embedded CMS has zero data requests');assert.equal(a.d.querySelector('#tdb-elfsight-timer-shell').hidden,true,'never paints while pending');a.tick(550);
 assert.equal(a.w.TDBAnnouncement.status().deadline,'2026-09-25T08:00:00.000Z','UK 09:00 maps to BST UTC08');assert.equal(a.w.TDBAnnouncement.status().mode,'countdown');
 assert.equal(a.d.querySelector('.tdb-announcement-pause'),null,'pause control removed');
 const track=a.d.querySelector('.tdb-announcement-track');
 const progress=a.d.querySelector('.tdb-announcement-clock circle:last-child');
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
 a=setup({path:'/services/fast-track'});a.tick(550);assert.equal(a.w.TDBAnnouncement.status().mode,'signature');assert.equal(a.d.querySelector('.tdb-announcement-track').children.length,1);a.tick(20000);assert.equal(a.w.TDBAnnouncement.status().mode,'signature');a.w.dispatchEvent(new a.w.Event('pagehide'));assert.equal(a.w.TDBAnnouncement.status().ticking,false);a.close();
 a=setup({embedded:false,saved:false});assert.equal(a.calls(),0,'no settings read before consent');a.w.dispatchEvent(new a.w.Event('CookieScriptReject'));assert.equal(a.calls(),1);a.w.dispatchEvent(new a.w.Event('CookieScriptAccept'));assert.equal(a.w.TDBAnnouncement.status().mounted,false,'duplicate consent does not paint fallback during read');await a.flush();a.tick(550);assert.equal(a.calls(),1);assert.equal(a.w.TDBAnnouncement.status().mode,'countdown');a.close();
 a=setup({fields:{...fieldValues,'smile-release-time':'March 28, 2027','smile-release-uk-time':'01:30'}});assert.equal(a.w.TDBAnnouncement.status().deadline,null,'nonexistent UK spring-forward time rejected');a.close();
 console.log('PASS: CMS BST conversion, missing-hour rejection, verbatim CMS titles/actions, left-slide loop, hover pause, mobile drawer route, Signature-only route, hidden/pagehide pause, consent-gated one settings read.');
})().catch(e=>{console.error(e);process.exitCode=1});
