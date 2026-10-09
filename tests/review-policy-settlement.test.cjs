const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('src/reviews/native/drawer-content.js');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){const dom=new JSDOM('',{url:'https://fixture.test/',runScripts:'outside-only'});dom.window.eval(read('dist/tdb-review-cms.js'));dom.window.eval(read('dist/tdb-swiper-8.4.7.min.js'));return dom;}
test('drawer delegates selection to CMS while retaining stable ordering, aliases, nulls and combined filters',()=>{
 const dom=setup(),w=dom.window;
 try{
  const records=[
   {id:'a',rating:5,platform:'Google',date:'2024-01-01',topics:['veneers','comfort','invisalign']},
   {id:'b',rating:null,platform:'Direct testimonial',date:'',topics:['comfort']},
   {id:'c',rating:3,platform:'Google',date:'2025-01-01',topics:['veneers','comfort']},
   {id:'d',rating:5,platform:'Yell',date:'2024-01-01',topics:['clear-aligners','comfort']},
   {id:'e',rating:1,platform:'Yell',date:'invalid',topics:['veneers']},
   {id:'f',rating:5,platform:'Google',date:'2023-01-01',topics:['veneers','comfort','clear-aligners']}
  ];
  const empty={sort:'recommended',rating:[],platform:[],treatment:[],experience:[]};
  const body=source.slice(source.indexOf(' function matching('),source.indexOf(' function updateFilter',source.indexOf(' function matching(')));
  // Execute the adapter's actual delegation functions; no drawer UI or network
  // is needed to test which index/records array and selection it passes on.
  const functions=body.slice(0,body.indexOf('\n function ',body.indexOf(' function ordered(')+1));
  const data={indexReady:false,records,filterIndex:records.slice().reverse()};
  const make=new w.Function('cms','data','selection',functions+';return {matching,ordered};');
  const cases=[
   [{},'abcdef'],[{sort:'highest'},'adfc eb'.replace(/ /g,'')],
   [{sort:'lowest'},'ecadfb'],[{sort:'recent'},'cadfbe'],[{sort:'oldest'},'fadcbe'],
   [{rating:['5','unrated']},'abdf'],[{platform:['Google','Yell']},'acdef'],
   [{treatment:['veneers'],experience:['comfort']},'acf'],
   [{treatment:['clear-aligners']},'adf'],[{treatment:['invisalign']},'adf'],
   [{rating:['5'],platform:['Google'],treatment:['veneers','clear-aligners'],experience:['comfort'],sort:'oldest'},'fa'],
   [{rating:['unrated'],platform:['Google']},'']
  ];
  for(const [overrides,expected] of cases){const state={...empty,...overrides};const api=make(w.TDBReviewCMS,data,state);assert.equal(api.ordered().map(r=>r.id).join(''),expected,JSON.stringify(state));}
  data.indexReady=true;assert.equal(make(w.TDBReviewCMS,data,empty).ordered().map(r=>r.id).join(''),'fedcba','ready index owns the stable recommended order');
  assert.equal(records.map(r=>r.id).join(''),'abcdef','selection never mutates cached records');
 }finally{w.close();}
});
test('review settlement appends once after motion, preserves release delay, and ignores closing/destroyed state',async()=>{
 const dom=setup(),w=dom.window;
 try{
  const engine=w.TDBSwiper,events=new Map(),slides=[{},{}],reveals=[];let appends=0;
  const s={slides,activeIndex:0,animating:false,params:{},on(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn);},off(name,fn){const a=events.get(name)||[],i=a.indexOf(fn);if(i>=0)a.splice(i,1);},emit(name){(events.get(name)||[]).forEach(fn=>fn());},init(){}};
  w.TDBSwiper={onSettled:engine.onSettled,create(viewport,options){Object.entries(options.on).forEach(([event,fn])=>s.on(event,fn));return s;}};
  w.TDBCarouselVisibility={bind(){}};
  const create=source.slice(source.indexOf(' function createSwiper('),source.indexOf(' function build('));
  const mount=new w.Function('appendRecords','reveal','slides',`let swiper=null,phase='moving',destroyed=false,settledSlide=slides[0];const viewport={},landscape=false,reduced={matches:false},motion={duration:()=>700,reviews:{cardDelay:83}},reading={bind(){}},reflect=()=>{},begin=()=>{},captureReadingAnchor=()=>{},applyReadingAnchor=()=>{};${create};createSwiper();return{setPhase:value=>phase=value,setDestroyed:value=>destroyed=value};`);
  const api=mount(()=>appends++,delay=>reveals.push(delay),slides);
  s.emit('touchStart');s.emit('touchEnd');s.animating=true;await flush();assert.equal(appends,0);assert.equal(reveals.length,0);
  s.activeIndex=1;s.animating=false;s.emit('transitionEnd');await flush();assert.equal(appends,1);assert.deepEqual(reveals,[undefined]);
  s.activeIndex=0;s.emit('touchStart');s.emit('touchEnd');await flush();assert.equal(reveals.at(-1),83,'same-card release keeps its existing delay');
  s.activeIndex=1;s.emit('touchStart');s.emit('touchEnd');await flush();assert.equal(reveals.at(-1),undefined,'instant changed slide retains directional delay');
  api.setPhase('closed');s.emit('transitionEnd');await flush();assert.equal(reveals.length,3);
  const before=appends;api.setDestroyed(true);s.emit('transitionEnd');await flush();assert.equal(appends,before);
  s.emit('beforeDestroy');
 }finally{w.close();}
});
