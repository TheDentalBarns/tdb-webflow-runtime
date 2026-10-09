// Compare rendered progress with the deployed baseline, including real homepage
// markup/CSS when TDB_HOME_HTML and TDB_DESIGNER_CSS are supplied. No network.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const baseline='84f3b904072e377e272e5240304bfd5a2f0770c8';
const old=file=>execFileSync('git',['show',`${baseline}:${file}`],{cwd:root,encoding:'utf8'});
const current=file=>fs.readFileSync(path.join(root,file),'utf8');
const isolate=source=>{
 const start=source.indexOf('  const progress = (() => {');
 return `(() => {${source.slice(start,source.indexOf('\n  })();',start)+9)};progress.refresh();})();`;
};
const native=process.env.TDB_HOME_HTML&&process.env.TDB_DESIGNER_CSS;
const fixture=`<section><div class="tdb-service-parallax"><div class="swiper"><div class="swiper-wrapper">${[4,0,1,2,3,4,0].map((v,i)=>`<div class="swiper-slide" data-swiper-slide-index="${v}" style="width:${80+i*3}%"></div>`).join('')}</div></div><div data-tdb-native-progress><span></span><span></span></div></div></section>`;
const css=native?fs.readFileSync(process.env.TDB_DESIGNER_CSS,'utf8'):`*{box-sizing:border-box}body{margin:0}.tdb-service-parallax{position:relative;margin:20.25px;width:calc(100% - 40.5px)}.swiper{width:100%;height:120.5px;overflow:hidden}.swiper-wrapper{display:flex}.swiper-slide{height:120.5px;flex-shrink:0}[data-tdb-native-progress]{position:absolute;height:5px;padding:0;border:0}[data-tdb-native-progress]>span{position:absolute;height:100%;background:black}`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.TDB_CHROMIUM,args:['--no-sandbox']});
 try{
  const parser=await browser.newPage();
  const variants=native?await parser.evaluate(html=>{
   const dom=new DOMParser().parseFromString(html,'text/html');
   return ['.tdb-service-parallax','[data-tdb-treatment]'].map(selector=>{
    const component=dom.querySelector(selector);if(!component)throw Error('Missing '+selector);
    const section=component.closest('section,header')||component;
    section.querySelectorAll('script').forEach(node=>node.remove());
    return {selector,html:section.outerHTML};
   });
  },fs.readFileSync(process.env.TDB_HOME_HTML,'utf8')):[{selector:'.tdb-service-parallax',html:fixture}];
  await parser.close();
  let beforeReads=0,afterReads=0;
  for(const width of [375,390,667,768,1024,1440])for(const variant of variants){
   const results=[];
   for(const read of [old,current]){
    const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2});
    await page.route('**/*',route=>route.abort());
    await page.setContent(`<html data-wf-page="677cf86df9952f978d94d8a9"><head><style>${css}</style></head><body>${variant.html}</body></html>`);
    await page.locator(variant.selector).scrollIntoViewIfNeeded();
    await page.evaluate(selector=>{
     window.geometryReads=0;
     const root=document.querySelector(selector),original=Element.prototype.getBoundingClientRect;
     Element.prototype.getBoundingClientRect=function(){if(root.contains(this)||this===root)geometryReads++;return original.call(this);};
    },variant.selector);
    await page.addScriptTag({content:read('src/shared/rendered-progress.js')});
    await page.addScriptTag({content:isolate(read('src/sliders/parallax.js'))});
    await page.waitForTimeout(100);
    const states=[];
    for(const offset of [0,137.25,415.5,900,-143.75]){
     await page.evaluate(({selector,offset})=>document.querySelector(selector+' > .swiper > .swiper-wrapper').style.transform=`translateX(${-offset}px)`,{selector:variant.selector,offset});
     await page.waitForTimeout(40);
     states.push(await page.evaluate(selector=>{
      const track=document.querySelector(selector+' > [data-tdb-native-progress]'),r=track.getBoundingClientRect();
      return {track:[r.left,r.top,r.width],markers:[...track.children].map(node=>({width:parseFloat(node.style.width),x:parseFloat(node.style.transform.match(/translateX\((.*)px\)/)?.[1])}))};
     },variant.selector));
    }
    await page.evaluate(()=>{geometryReads=0;for(let i=0;i<10;i++)dispatchEvent(new Event('resize'));});
    await page.waitForTimeout(70);
    const reads=await page.evaluate(()=>geometryReads);
    await page.waitForTimeout(70);
    assert.equal(await page.evaluate(()=>geometryReads),reads,'idle performs no additional geometry reads');
    results.push({states,reads});await page.close();
   }
   for(let i=0;i<results[0].states.length;i++){
    const a=results[0].states[i],b=results[1].states[i];
    a.track.forEach((value,j)=>assert(Math.abs(value-b.track[j])<0.02,`${width} ${variant.selector}: track geometry differs`));
    a.markers.forEach((value,j)=>{assert.equal(value.width,b.markers[j].width);assert.equal(value.x,b.markers[j].x);});
   }
   assert(results[1].reads<results[0].reads,'resize burst must reduce geometry work');
   beforeReads+=results[0].reads;afterReads+=results[1].reads;
  }
  console.log(`PASS: identical marker positions at 6 widths, forward/reverse and fractional offsets; resize-burst geometry reads ${beforeReads} -> ${afterReads}; idle reads 0 (${native?'homepage markup/CSS':'variable-width fixture'}).`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
