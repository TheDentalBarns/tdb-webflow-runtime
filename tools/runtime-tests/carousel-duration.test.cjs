const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../../',p),'utf8');
test('all carousel implementations retain mobile timing and share bounded desktop scaling',()=>{
  for(const file of ['src/sliders/sliders.js','src/reviews/review-drawer.js','src/reviews/power-snippets.js','src/team-quotes/team-quotes.js','src/first-impressions/first-impressions.js']){
    const source=read(file),swiper=file.includes('sliders.js'),name=swiper?'parallaxDuration':'carouselDuration';
    const start=source.indexOf('  function '+name+'('),end=source.indexOf('\n  }',start)+4;
    const state={desktop:false},ctx=vm.createContext({matchMedia:()=>({matches:state.desktop})});
    vm.runInContext(source.slice(start,end),ctx);
    const duration=width=>ctx[name](swiper?{clientWidth:width}:width);
    for(const width of [320,390,768,991])assert.equal(duration(width),400,file);
    state.desktop=true;
    assert.equal(duration(375),650,file);assert.equal(duration(1440),784,file);assert.equal(duration(3840),950,file);
  }
});
test('Swiper resize timing waits for the active transition and cleans up its observer',()=>{
  const s=read('src/sliders/sliders.js'),start=s.indexOf('  function parallaxDuration('),end=s.indexOf('  // Only converted CMS',start);
  const events=new Map(),frames=[],styles=new Map(),media={matches:true,addEventListener(t,fn){this.fn=fn},removeEventListener(){this.fn=null}},el={clientWidth:1200};
  let observer;
  const ctx=vm.createContext({window:{addEventListener(){},removeEventListener(){}},matchMedia:()=>media,requestAnimationFrame:fn=>(frames.push(fn),frames.length),cancelAnimationFrame(){},ResizeObserver:class{constructor(cb){this.cb=cb;observer=this}observe(){}disconnect(){this.disconnected=true}}});
  vm.runInContext(s.slice(start,end),ctx);
  const component={style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)}},swiper={params:{speed:716},originalParams:{speed:716},animating:false,on:(n,fn)=>events.set(n,fn),off:n=>events.delete(n)};
  ctx.bindParallaxDuration(component,el,swiper,'--tdb-carousel-duration');
  swiper.animating=true;el.clientWidth=1920;observer.cb();frames.shift()();assert.equal(swiper.params.speed,716);
  swiper.animating=false;events.get('slideChangeTransitionEnd')();assert.equal(swiper.params.speed,905);
  media.matches=false;media.fn();frames.shift()();assert.equal(swiper.params.speed,400);assert.equal(styles.get('--tdb-carousel-duration'),'400ms');
  events.get('beforeDestroy')();assert(observer.disconnected);assert.equal(styles.size,0);
});
