const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.env.TDB_MOTION_SOURCE || path.join(__dirname, '../dist/tdb-motion.js'), 'utf8');
const baseline = process.env.TDB_MEASURE_BASELINE === '1';
const fixture = `<!doctype html><style>
html,body{margin:0;overflow-anchor:none}.dd{height:20px;opacity:.65}
.break{height:240px;overflow:hidden;position:relative}.image{height:280px;position:absolute;top:-20px;width:100%}
.tail{height:2000px}
</style><main>${'<p class="dd">Shared fade</p>'.repeat(24)}</main>
<div class="break" id="p1"><div class="image" data-tdb-page-break-image></div></div>
<div class="break" id="p2"><div class="image" data-tdb-page-break-image></div></div><div class="tail"></div>`;
(async () => {
  const browser = await chromium.launch({executablePath:process.env.TDB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
      const page = await browser.newPage({viewport}), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent(fixture);
      await page.addScriptTag({content:source});
      await page.evaluate(() => {
        const jobs = new Map(); let id = 0;
        requestAnimationFrame = callback => { jobs.set(++id, callback); return id; };
        cancelAnimationFrame = id => jobs.delete(id);
        window.measureLog = [];
        for (const name of ['scrollY','innerHeight','innerWidth']) {
          const get = Object.getOwnPropertyDescriptor(window,name).get;
          Object.defineProperty(window,name,{configurable:true,get(){measureLog.push(name);return get.call(window);}});
        }
        const extent = Object.getOwnPropertyDescriptor(Element.prototype,'scrollHeight').get;
        Object.defineProperty(document.documentElement,'scrollHeight',{get(){measureLog.push('extent');return extent.call(this);}});
        const computed = window.getComputedStyle;
        window.getComputedStyle = node => {measureLog.push('style');return computed(node);};
        window.nodes = [...document.querySelectorAll('.dd')];
        for (const node of document.querySelectorAll('.dd,.break,.image')) {
          const rect = node.getBoundingClientRect.bind(node);
          node.getBoundingClientRect = () => {measureLog.push('rect');return rect();};
          for (const property of ['opacity','transform']) Object.defineProperty(node.style,property,{
            get:() => node.style.getPropertyValue(property),
            set:value => {measureLog.push('write');node.style.setProperty(property,value);}
          });
        }
        window.flush = () => {
          measureLog.length = 0;
          const batch = [...jobs.values()]; jobs.clear();
          batch.forEach(callback => callback(performance.now()));
          return measureLog.slice();
        };
        window.counts = log => Object.fromEntries(['scrollY','innerHeight','innerWidth','extent','style','rect'].map(key => [key,log.filter(value => value === key).length]));
      });
      const mountReads = await page.evaluate(() => {
        document.querySelector('main').style.paddingTop = '1px';
        measureLog.length = 0;
        window.dd = TDBMotion.ddText(nodes);
        return counts(measureLog);
      });
      if (!baseline) assert.deepEqual(mountReads,{scrollY:0,innerHeight:0,innerWidth:0,extent:0,style:0,rect:0},'DD registration must not force style/geometry after another component writes');
      await page.evaluate(() => {
        window.pb1 = TDBMotion.pageBreaks([document.getElementById('p1')]);
        window.pb2 = TDBMotion.pageBreaks([document.getElementById('p2')]);
      });
      const frame = await page.evaluate(() => {
        pb1.refresh();pb2.refresh();
        const log = flush();return {counts:counts(log),log};
      });
      if (!baseline) for (const key of ['scrollY','innerHeight','innerWidth','extent']) assert.equal(frame.counts[key],1,key+' is sampled once per read phase');
      const split = frame.log.indexOf('write');
      assert(split >= 0 && frame.log.slice(split).every(value => value === 'write'),'shared frame reads precede all writes');
      assert.equal(await page.evaluate(() => +nodes[0].style.opacity),.65,'stylesheet opacity is retained at first paint');
      const entrance = await page.evaluate(() => {
        measureLog.length=0;dd.enter(nodes.slice(0,3),{atPosition:true});return measureLog.slice();
      });
      if (!baseline) assert(entrance.slice(entrance.indexOf('write')).every(value => value === 'write'),'multi-node entrance must not alternate opacity writes and geometry reads');
      const previous = await page.evaluate(() => {
        flush();return +nodes[0].style.opacity;
      });
      const following = await page.evaluate(() => {
        dispatchEvent(new WheelEvent('wheel',{deltaY:100}));scrollTo(0,100);dispatchEvent(new Event('scroll'));
        let log=flush();for(let n=0;n<24;n++)flush();return {value:+nodes[0].style.opacity,counts:counts(log)};
      });
      assert.notEqual(following.value,previous,'new frames use fresh scroll and element geometry');
      // A quote can enter before its deferred first measurement. The explicit
      // entrance must win over the CSS starting opacity.
      const early = await page.evaluate(() => {
        const node=document.createElement('p');node.className='dd';node.style.opacity='0';document.body.prepend(node);
        const client=TDBMotion.ddText([node]);client.enter();flush();const value=+node.style.opacity;client.destroy();return value;
      });
      assert.equal(early,1,'explicit entrance before the first frame remains fully visible');
      await page.evaluate(() => {dd.destroy();pb1.destroy();pb2.destroy();});
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({mode:baseline?'baseline':'candidate',viewport,mountReads,frameReads:frame.counts,entranceOrder:entrance,following:following.value}));
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
