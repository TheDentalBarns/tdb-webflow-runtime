/* Temporary, opt-in staging measurements. No telemetry or production execution. */
(() => {
  'use strict';
  if (location.hostname !== 'dentalbarns.webflow.io' || new URLSearchParams(location.search).get('tdbperf') !== '1') return;
  if (document.getElementById('tdb-perf-panel')) return;
  const supported = PerformanceObserver.supportedEntryTypes || [];
  const events = { longtask: [], 'long-animation-frame': [], event: [], 'layout-shift': [] };
  const observers = [];
  const records = [];
  const visibility = [];
  let active = null, running = false, stopped = false, lastTick = 0;
  const round = n => Math.round(n * 100) / 100;
  const quantile = (a, q) => { const s = a.slice().sort((x,y)=>x-y); return s.length ? s[Math.min(s.length-1, Math.floor((s.length-1)*q))] : 0; };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  for (const type of Object.keys(events)) {
    if (!supported.includes(type)) continue;
    const observer = new PerformanceObserver(list => events[type].push(...list.getEntries()));
    observer.observe(type === 'event' ? {type, buffered:true, durationThreshold:16} : {type, buffered:true});
    observers.push({type, observer});
  }
  document.addEventListener('visibilitychange', () => visibility.push({time:performance.now(),state:document.visibilityState}));
  const panel = document.createElement('section');
  panel.id = 'tdb-perf-panel';
  panel.setAttribute('aria-label', 'Staging performance recorder');
  panel.innerHTML = '<style>#tdb-perf-panel{position:fixed;z-index:2147483647;right:8px;bottom:8px;width:min(390px,95vw);padding:12px;background:#fff;color:#111;border:2px solid #167447;font:12px/1.4 system-ui;box-shadow:none}#tdb-perf-panel button,#tdb-perf-panel select,#tdb-perf-panel input{font:12px system-ui;color:#111;background:#eee;border:1px solid #777;padding:6px;margin:3px}#tdb-perf-panel button{cursor:pointer}#tdb-perf-panel textarea{width:100%;height:80px;font:10px monospace;color:#111;background:#fff}#tdb-perf-panel[data-running] .tdb-perf-controls,#tdb-perf-panel[data-running] textarea{display:none}#tdb-perf-panel[data-running]{width:auto;max-width:80vw;padding:6px}</style><strong>STAGING PERFORMANCE RECORDER</strong><div id="tdb-perf-status" role="status">Ready</div><div class="tdb-perf-controls"><button id="tdb-perf-page">Page suite × 3</button><button id="tdb-perf-components">Carousel keys × 3</button><button id="tdb-perf-warm">Warm page</button><br><label>Manual label <input id="tdb-perf-label" value="rapid-wheel"></label><button id="tdb-perf-manual">Record manual input</button></div><button id="tdb-perf-stop">Stop recording</button><textarea id="tdb-perf-results" aria-label="Performance results" readonly></textarea>';
  document.body.append(panel);
  const status = panel.querySelector('#tdb-perf-status');
  const output = panel.querySelector('#tdb-perf-results');
  const environment = () => ({url:location.origin+location.pathname, pageId:document.documentElement.dataset.wfPage, runtimePins:[...new Set([...document.scripts].map(s=>s.src.match(/tdb-webflow-runtime@([^/]+)/)?.[1]).filter(Boolean))], userAgent:navigator.userAgent, viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}, hardwareConcurrency:navigator.hardwareConcurrency, deviceMemory:navigator.deviceMemory || null, supportedEntryTypes:supported, visibility:document.visibilityState, cpuThrottle:'not applied',gpuCounters:'unavailable',scrollDriver:'programmatic scrollTo; manual wheel/drag records identified separately'});
  function render() { output.value = JSON.stringify({version:1,environment:environment(),records,limitations:['rAF gaps are main-thread frame-cadence observations, not measured GPU dropped frames.','Long-animation-frame attribution only covers qualifying frames and scripts; it is not total CPU usage.','Cross-origin iframe work is not attributable.','Programmatic scrolling and synthetic keyboard tests are not physical touch tests.','Instrumentation and browser-host overhead are included.','Browser viewport profiles are not physical devices.']}); }
  function pulse(t) { if (active) { if (lastTick && t > lastTick) active.intervals.push(t-lastTick); lastTick=t; } else lastTick=0; requestAnimationFrame(pulse); }
  requestAnimationFrame(pulse);
  function start(label, extra={}) {
    if (active) stop();
    const startTime=performance.now();
    active={label,...extra,startTime,startedAt:new Date().toISOString(),intervals:[],startVisibility:document.visibilityState,heapBefore:performance.memory?.usedJSHeapSize??null};
    lastTick=0;panel.setAttribute('data-running','');status.textContent='Recording: '+label;
  }
  function stop(extra={}) {
    if (!active) return;
    const endTime=performance.now(), r=active;active=null;
    for (const {type,observer} of observers) events[type].push(...observer.takeRecords());
    const inWindow = type => events[type].filter(e=>e.startTime>=r.startTime && e.startTime<endTime);
    const tasks=inWindow('longtask'),loafs=inWindow('long-animation-frame'),input=inWindow('event');
    const scripts=new Map();
    for(const f of loafs) for(const s of f.scripts||[]) { const key=[s.sourceURL||'unknown',s.sourceFunctionName||'',s.invoker||''].join('|');const row=scripts.get(key)||{url:s.sourceURL||'unknown',function:s.sourceFunctionName||'',invoker:s.invoker||'',durationMs:0,forcedStyleAndLayoutMs:0,count:0};row.durationMs+=s.duration||0;row.forcedStyleAndLayoutMs+=s.forcedStyleAndLayoutDuration||0;row.count++;scripts.set(key,row); }
    const referenceInterval=1000/60;
    const record={label:r.label,run:r.run??null,component:r.component??null,input:r.input??'none',startedAt:r.startedAt,durationMs:round(endTime-r.startTime),validVisibility:r.startVisibility==='visible'&&!visibility.some(v=>v.time>=r.startTime&&v.time<=endTime&&v.state!=='visible'),frameSamples:r.intervals.length,medianFrameIntervalMs:round(quantile(r.intervals,.5)),p95FrameIntervalMs:round(quantile(r.intervals,.95)),maxFrameIntervalMs:round(Math.max(0,...r.intervals)),gapsOver25ms:r.intervals.filter(x=>x>25).length,gapsOver50ms:r.intervals.filter(x=>x>50).length,frameBudgetAdherence60Hz:r.intervals.length?round(100*r.intervals.filter(x=>x<=referenceInterval*1.5).length/r.intervals.length):null,longTaskCount:tasks.length,longTaskMs:round(tasks.reduce((n,e)=>n+e.duration,0)),blockingBeyond50ms:round(tasks.reduce((n,e)=>n+Math.max(0,e.duration-50),0)),longAnimationFrames:loafs.length,longAnimationFrameMs:round(loafs.reduce((n,e)=>n+e.duration,0)),longAnimationBlockingMs:round(loafs.reduce((n,e)=>n+(e.blockingDuration||0),0)),observedEventCount:input.length,maxObservedEventDurationMs:round(Math.max(0,...input.map(e=>e.duration))),layoutShift:round(inWindow('layout-shift').filter(e=>!e.hadRecentInput).reduce((n,e)=>n+e.value,0)),heapBefore:r.heapBefore,heapAfter:performance.memory?.usedJSHeapSize??null,scriptAttribution:[...scripts.values()].sort((a,b)=>b.durationMs-a.durationMs).slice(0,30).map(s=>({...s,durationMs:round(s.durationMs),forcedStyleAndLayoutMs:round(s.forcedStyleAndLayoutMs)})),totalCpuTimeMs:null,gpuUsagePercent:null,...extra};
    records.push(record);panel.removeAttribute('data-running');status.textContent='Saved '+records.length+' records. Last: '+r.label;render();return record;
  }
  function maxY(){return Math.max(0,document.documentElement.scrollHeight-innerHeight);}
  async function travel(duration,position) { const begin=performance.now();while(!stopped){const t=await frame();const progress=Math.min(1,(t-begin)/duration);window.scrollTo({top:position(progress),behavior:'instant'});if(progress>=1)break;} }
  async function warm(){const range=maxY();await travel(2500,p=>range*p);await wait(1200);window.scrollTo({top:0,behavior:'instant'});await wait(1500);}
  async function pageSuite(){if(running||active)return;running=true;stopped=false;try{status.textContent='Warming page before interaction measurements';await warm();for(let run=1;run<=3&&!stopped;run++){window.scrollTo({top:0,behavior:'instant'});await wait(900);start('idle',{run});await wait(5000);stop();if(stopped)break;const distance=Math.min(maxY(),innerHeight*4);start('normal-scroll',{run,input:'programmatic scrollTo'});await travel(8000,p=>distance*p);stop({distancePx:round(distance)});window.scrollTo({top:0,behavior:'instant'});await wait(700);if(stopped)break;const range=maxY();start('rapid-scroll-reversals',{run,input:'programmatic scrollTo'});await travel(8000,p=>{const cycle=(p*4)%2;return range*(cycle<=1?cycle:2-cycle);});stop({distancePx:round(range*4),reversals:3});}}finally{stop();running=false;panel.removeAttribute('data-running');status.textContent='Page suite complete: '+records.length+' records';render();}}
  function components(){const list=[...document.querySelectorAll('[aria-roledescription="carousel"],.tdb-ig-feed,.logo-slider')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&!e.closest('[hidden],[inert]'));return list.filter(e=>!list.some(p=>p!==e&&p.contains(e)));}
  function signature(root){return [...root.querySelectorAll('[style*="transform"],[aria-current="true"],[aria-hidden="false"],[data-slide-index]')].slice(0,25).map(e=>[e.getAttribute('style'),e.getAttribute('aria-current'),e.getAttribute('aria-hidden')].join(':')).join('|')+';'+root.scrollLeft+';'+(root.querySelector('[role="status"]')?.textContent||'');}
  async function componentSuite(){if(running||active)return;running=true;stopped=false;try{status.textContent='Warming carousels';await warm();const roots=components();for(let index=0;index<roots.length&&!stopped;index++){const root=roots[index],name=root.getAttribute('aria-label')||root.className.split(' ').slice(0,3).join(' ');root.scrollIntoView({block:'center',behavior:'instant'});await wait(1600);for(let run=1;run<=3&&!stopped;run++){const target=root.querySelector('[tabindex="0"]')||root;const samples=new Set([signature(root)]);let n=0;start('rapid-carousel-keys',{run,component:name,input:'synthetic ArrowRight/ArrowLeft every 160ms'});const timer=setInterval(()=>{const key=Math.floor(n/6)%2?'ArrowLeft':'ArrowRight';target.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));samples.add(signature(root));n++;},160);await wait(4500);clearInterval(timer);await wait(1000);stop({componentIndex:index,commands:n,distinctVisualSignatures:samples.size,componentResponded:samples.size>1});await wait(500);}}}finally{stop();running=false;panel.removeAttribute('data-running');status.textContent='Carousel suite complete: '+records.length+' records';render();}}
  panel.querySelector('#tdb-perf-page').onclick=()=>pageSuite().catch(e=>{stop({error:e.message});running=false;status.textContent='Error: '+e.message;});
  panel.querySelector('#tdb-perf-components').onclick=()=>componentSuite().catch(e=>{stop({error:e.message});running=false;status.textContent='Error: '+e.message;});
  panel.querySelector('#tdb-perf-warm').onclick=async()=>{if(!running&&!active){running=true;await warm();running=false;status.textContent='Page warmed';}};
  panel.querySelector('#tdb-perf-manual').onclick=()=>{if(!running&&!active){stopped=false;start(panel.querySelector('#tdb-perf-label').value,{input:'native browser input recorded externally'});}};
  panel.querySelector('#tdb-perf-stop').onclick=()=>{stopped=true;stop();};
  render();
})();
