/* TDB Treatment Calculator v1.4.9 — deterministic pricing and planning rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TDBCalculatorCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const VERSION = '1.4.9';
  const IDS = Object.freeze({
    assessment: '6aa293f6253d574a41978d9e', design: '68386f15264c9bdb140b5f2e',
    whitening: '681ce51276b22da0b0660090', aligners: '67a227e75f8c501023eb066b',
    bonding: '681ce7a6838a937aa274f5e6', veneers: '681dfc7415fdf2571f077b0f',
    gumline: '68386aca9ee514c02cdda9ee', fillings: '68d6b282da240abf72520b6a',
    rct: '6a61ce5648ee7f280db22a34', crowns: '68d7ca91db5f05043ba12fa1',
    onlays: '68d7cfac090cb5cda1b931d9', extractions: '68d6affec0a324b379f2c5b5',
    hygiene: '681dfde1b4412464104bca59', trial: '6aaaa3d4ef8655079897b000'
  });
  const OPTIONS = Object.freeze([
    {key:'whitening',category:'cosmetic',quantity:false},
    {key:'aligners',category:'cosmetic',quantity:false},
    {key:'bonding',category:'cosmetic',quantity:true},
    {key:'veneers',category:'cosmetic',quantity:true},
    {key:'gumline',category:'cosmetic',quantity:true},
    {key:'replacement',record:'fillings',category:'restorative',quantity:true},
    {key:'fillings',category:'restorative',quantity:true},
    {key:'rct',category:'restorative',quantity:true},
    {key:'crowns',category:'restorative',quantity:true},
    {key:'onlays',category:'restorative',quantity:true},
    {key:'extractions',category:'restorative',quantity:true}
  ]);
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const finite = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));
  const clamp = (v,min,max) => Math.min(max,Math.max(min,v));
  function parsePrice(raw) {
    const text=String(raw||'').replace(/\u00a0/g,' ').trim();
    const match=text.match(/^(from\s+)?£\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?:\s+per\s+(tooth|surface|lesion|arch|area))?$/i);
    if (!match) return null;
    const pennies=Math.round(Number(match[2].replace(/,/g,''))*100);
    if (!Number.isSafeInteger(pennies)||pennies<=0) return null;
    return {min:pennies,from:!!match[1],unit:(match[3]||'').toLowerCase()};
  }
  function timingFromFields(min,max,unit){
    return finite(min)&&finite(max)&&Number(min)>=0&&Number(max)>=Number(min)&&['weeks','months'].includes(unit)&&Number(max)<=(unit==='months'?120:520)?{min:Number(min),max:Number(max),unit}:null;
  }
  function recordFromFields(f) {
    const price=parsePrice(f.price), tiers=[1,2,3,4,5].map(n=>f['tier'+n]).filter(v=>String(v||'').trim());
    const parsed=tiers.map(parsePrice);
    const valid=!!price && parsed.every(Boolean) && (!parsed.length || parsed[0].min===price.min);
    const vals=valid ? parsed.map(p=>p.min) : [];
    return {
      id:f.record, name:String(f.name||'').trim(), label:String(f.label||f.name||'').trim(),
      tooltip:String(f.tooltip||'').trim(), rawPrice:String(f.price||''),
      valid, min:valid?price.min:null,max:valid?Math.max(price.min,...vals):null,
      from:!!price?.from,unit:price?.unit||'',tiers:vals,
      tierLabels:[1,2,3].map(n=>String(f['tier'+n+'friendly']||'').trim()),
      timing:timingFromFields(f.min,f.max,f.unit),
      tierTimings:[1,2,3].map(n=>timingFromFields(f['tier'+n+'min'],f['tier'+n+'max'],f.unit)),
      includesWhitening:f.whitening===true||f.whitening==='true',
      includesHygiene:f.hygiene===true||f.hygiene==='true',
      bookingDeposit:finite(f.deposit)?Math.round(Number(f.deposit)*100):null
    };
  }
  function newState() {
    return {categories:[],selected:{},assessment:'none',hygiene:false,finance:false,deposit:0,term:12,target:'',start:'',delay:0};
  }
  function normaliseState(raw) {
    const s=newState();
    if(!raw||typeof raw!=='object')return s;
    s.categories=['cosmetic','restorative'].filter(k=>Array.isArray(raw.categories)&&raw.categories.includes(k));
    for(const o of OPTIONS){
      const v=raw.selected&&own(raw.selected,o.key)?raw.selected[o.key]:null;
      if(v&&s.categories.includes(o.category)){
        s.selected[o.key]={qty:o.quantity?clamp(Math.floor(Number(v.qty)||1),1,o.record==='fillings'||o.key==='fillings'?160:32):1,tier:o.key==='replacement'?2:['aligners','bonding','veneers'].includes(o.key)&&Number.isInteger(v.tier)&&v.tier>=0&&v.tier<=2?v.tier:null};
        if(o.key==='veneers'){const arches=['upper','lower'].filter(a=>Array.isArray(v.arches)&&v.arches.includes(a));s.selected.veneers.arches=arches.length?arches:['upper'];}
      }
    }
    s.assessment=['none','design','signature'].includes(raw.assessment)?raw.assessment:'none';
    s.hygiene=raw.hygiene===true;s.finance=raw.finance===true;
    s.deposit=finite(raw.deposit)?clamp(Math.round(Number(raw.deposit)),0,100000000):0;
    s.term=clamp(Math.round(Number(raw.term)||12),3,12);
    s.target=parseDate(raw.target)?raw.target:'';s.start=parseDate(raw.start)?raw.start:'';
    s.delay=clamp(Math.round(Number(raw.delay)||0),0,730);
    return s;
  }
  function allowedOptions(config={}){
    return OPTIONS.filter(o=>config[o.category]!==false);
  }
  function estimate(records,raw,config={}) {
    const state=normaliseState(raw), options=allowedOptions(config),selected=options.filter(o=>own(state.selected,o.key));
    const lines=[],missing=[],a=records[IDS.aligners];
    const aligners=selected.some(o=>o.key==='aligners'), cosmetic=selected.some(o=>o.category==='cosmetic');
    const whitenIncluded=aligners&&!!a?.includesWhitening,hygieneIncluded=aligners&&!!a?.includesHygiene;
    const required=selected.length>0, assessment=required?'signature':state.assessment;
    function add(key,recordKey,quantity=1,tier=null,included=false,label){
      const r=records[IDS[recordKey]];
      const l={key,recordKey,record:r,label:label||r?.label||recordKey,qty:quantity,tier,included};
      if(included){l.min=l.max=0;l.from=false;}
      else if(!r?.valid){l.min=l.max=null;missing.push(l.label);}
      else{
        const tierValue=Number.isInteger(tier)?r.tiers[tier]:null;
        l.min=(tierValue??r.min)*quantity;l.max=(tierValue??r.max)*quantity;l.from=r.from;
      }
      lines.push(l);return l;
    }
    if(assessment!=='none')add('assessment',assessment==='signature'?'assessment':'design');
    for(const o of selected){
      const v=state.selected[o.key];
      add(o.key,o.record||o.key,v.qty,v.tier,o.key==='whitening'&&whitenIncluded,o.key==='replacement'?'Metal filling replacement':undefined);
    }
    if(whitenIncluded&&!state.selected.whitening)add('whitening-included','whitening',1,null,true);
    if(cosmetic&&(hygieneIncluded||state.hygiene))add('hygiene','hygiene',1,null,hygieneIncluded);
    if(selected.some(o=>o.key==='veneers'))add('trial','trial',state.selected.veneers.arches.length);
    const order=['assessment','hygiene','extractions','replacement','fillings','rct','crowns','onlays','aligners','whitening','whitening-included','gumline','bonding','trial','veneers'];
    lines.sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key));
    const priced=lines.filter(l=>l.min!==null);
    const min=priced.reduce((n,l)=>n+l.min,0),max=priced.reduce((n,l)=>n+l.max,0);
    const starting=lines.some(l=>l.from),assessmentLine=lines.find(l=>l.key==='assessment');
    return {state,selected,lines,missing,min,max,starting,complete:missing.length===0,required,assessment,cosmetic,whitenIncluded,hygieneIncluded,assessmentLine,
      hiddenSelections:OPTIONS.filter(o=>own(state.selected,o.key)&&!options.includes(o)).map(o=>o.key)};
  }
  function payment(balance,term){
    if(!Number.isSafeInteger(balance)||balance<0||!Number.isInteger(term)||term<3||term>12)throw new RangeError('Invalid repayment input');
    const monthly=Math.floor(balance/term),final=balance-monthly*(term-1);
    return {balance,monthly,final,term};
  }
  function finance(estimate,deposit,term){
    if(!estimate.complete||!estimate.lines.length)return null;
    // The upfront payment includes the assessment once. At least £250 remains to finance.
    const minimumDeposit=estimate.assessmentLine?.min||0,minimumBorrowing=25000;
    if(!minimumDeposit||estimate.min-minimumDeposit<minimumBorrowing)return null;
    const limit=estimate.min-minimumBorrowing;
    const actualDeposit=clamp(Math.round(Number(deposit)||0),minimumDeposit,limit),months=clamp(Math.round(Number(term)||12),3,12);
    return {deposit:actualDeposit,minimumDeposit,minimumBorrowing,limit,assessment:minimumDeposit,low:payment(estimate.min-actualDeposit,months),high:payment(estimate.max-actualDeposit,months)};
  }
  function parseDate(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const [y,m,d]=value.split('-').map(Number);
    if(y<1900||y>2200)return null;
    const date=new Date(Date.UTC(y,m-1,d,12));
    return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?date:null;
  }
  const iso=d=>d.toISOString().slice(0,10);
  const addDays=(d,n)=>new Date(d.getTime()+n*86400000);
  function addMonths(date,n){
    const d=new Date(date),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);
    const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0,12)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;
  }
  function stageDate(d,t,which){return t.unit==='months'?addMonths(d,t[which]):addDays(d,t[which]*7);}
  function plan(records,e){
    const stages=[],assumed=[],has=k=>e.selected.some(o=>o.key===k);
    const weeks=(min,max=min)=>({min,max,unit:'weeks'});
    const defaults={extractions:weeks(2,4),fillings:weeks(0),rct:weeks(2),crowns:weeks(4),onlays:weeks(4),aligners:{min:6,max:18,unit:'months'},whitening:weeks(5),gumline:weeks(2),bonding:weeks(2),hygiene:weeks(1),trial:weeks(1),veneers:weeks(4)};
    function timing(key){
      const r=records[IDS[key]],tier=e.state.selected[key]?.tier;
      const t=(Number.isInteger(tier)&&r?.tierTimings?.[tier])||r?.timing;
      if(!t)assumed.push(r?.label||key);
      return t||defaults[key];
    }
    function push(key,label,options={}){
      const r=records[IDS[key]];
      stages.push({key,label:label||r?.label||key,timing:timing(key),costKeys:[key],description:r?.tooltip||'',...options});
    }
    if(!e.required)return {stages,unknown:[],notes:[]};
    const notes=['A first look at how your journey could unfold. Appointment availability, healing, refinements and your confirmed plan may change these dates.'];
    if(e.lines.some(l=>l.key==='hygiene'))push('hygiene',undefined,{appointment:true,description:'Healthy foundations before treatment. We allow one week after hygiene before the next treatment; a Smile Trial follows at least two weeks later.'});
    if(has('extractions'))push('extractions',undefined,{appointment:true,description:'Your selected extractions, with an indicative allowance before the next stage. Healing and any replacement plan are assessed individually.'});
    if(has('fillings')||has('replacement'))push('fillings',has('replacement')&&has('fillings')?'Fillings & metal filling replacement':has('replacement')?'Metal filling replacement':undefined,{appointment:true,costKeys:['fillings','replacement']});
    if(has('rct'))push('rct');
    const restorations=['crowns','onlays'].filter(has);
    if(restorations.length){
      const times=restorations.map(timing),label=restorations.join(' & ');
      const t=weeks(Math.max(...times.map(v=>v.min)),Math.max(...times.map(v=>v.max)));
      stages.push({key:'restoration-prep',label:'Prepare '+label,timing:t,appointment:true,costKeys:restorations,sharedFee:true,description:'Preparation for your selected '+label+'. The fitting appointment follows around four weeks later.'});
      stages.push({key:'restoration-fit',label:'Fit '+label,timing:weeks(0),appointment:true,costKeys:restorations,sharedFee:true,description:'Fit your bespoke porcelain restorations and check the bite. Preparation and fitting share one treatment fee.'});
      if(has('whitening')||has('aligners'))notes.push('Restorative care is shown first. Your dentist may adjust the order for tooth stability or final shade matching.');
    }
    if(e.cosmetic&&!e.lines.some(l=>l.key==='hygiene'))notes.push('Hygiene may be needed before cosmetic care. Add the allowance to see its price and place in your timeline.');
    if(has('aligners'))push('aligners');
    if(has('whitening')||e.whitenIncluded)push('whitening','Whitening & colour settling',{costKeys:['whitening','whitening-included'],description:'Three weeks of whitening, then two weeks for the colour to settle.'});
    if(has('gumline'))push('gumline');
    if(has('bonding'))push('bonding');
    if(has('veneers')){
      const arches=e.state.selected.veneers.arches;
      push('trial',records[IDS.trial]?.label||'Smile Trial',{appointment:true,minGap:14,description:'Preview your planned '+arches.join(' and ')+' smile before preparation. Charged once per selected arch. Allow one week from the trial to preparation.'});
      for(const [index,arch] of arches.entries()){
        stages.push({key:'veneers-'+arch+'-prep',label:'Prepare '+arch+' veneers',timing:timing('veneers'),appointment:true,minGap:index?7:0,costKeys:['veneers'],sharedFee:true,description:index?'Prepare the lower arch, one week after the upper veneers are fitted.':'Prepare the '+arch+' arch, one week after your Smile Trial.'});
        stages.push({key:'veneers-'+arch+'-fit',label:'Fit '+arch+' veneers',timing:weeks(0),appointment:true,costKeys:['veneers'],sharedFee:true,description:'Fit the '+arch+' veneers around four weeks after preparation, then check the fit, appearance and bite.'});
      }
    }
    if(assumed.length)notes.push('Indicative planning allowances are used for '+[...new Set(assumed)].join(', ')+'. Your dentist will confirm the timing.');
    return {stages,unknown:[],notes};
  }
  function schedule(plan,start){
    if(!parseDate(start))throw new RangeError('Invalid assessment date');
    const initial=parseDate(start);let low=addDays(initial,14),high=addDays(initial,14),lastLow=initial,lastHigh=initial;
    const stages=plan.stages.map(s=>{
      if(s.minGap){low=new Date(Math.max(low,addDays(lastLow,s.minGap)));high=new Date(Math.max(high,addDays(lastHigh,s.minGap)));}
      const fromMin=low,fromMax=high;
      low=stageDate(low,s.timing,'min');high=stageDate(high,s.timing,'max');
      lastLow=s.appointment?fromMin:low;lastHigh=s.appointment?fromMax:high;
      return {...s,startMin:iso(fromMin),startMax:iso(fromMax),endMin:iso(low),endMax:iso(high)};
    });
    return {start,stages,finishMin:iso(low),finishMax:iso(high),reliable:true};
  }
  function suggestedStart(plan,target,which){
    const end=parseDate(target);if(!end||plan.unknown.length||!plan.stages.length)return null;
    // Search whole calendar days: reversible date planning remains correct at month ends.
    let l=Math.max(Math.floor(parseDate('1900-01-01').getTime()/86400000),Math.floor(addMonths(end,-120).getTime()/86400000)),r=Math.floor(end.getTime()/86400000);
    const first=schedule(plan,iso(new Date(l*86400000+43200000)));
    if((which==='max'?first.finishMax:first.finishMin)>target)return null;
    while(l<r){const m=Math.ceil((l+r)/2),start=iso(new Date(m*86400000+43200000)),s=schedule(plan,start);const finish=which==='max'?s.finishMax:s.finishMin;if(finish<=target)l=m;else r=m-1;}
    return iso(new Date(l*86400000+43200000));
  }
  function timeline(records,e,target,today,startOverride){
    const p=plan(records,e),now=parseDate(today);if(!now)throw new RangeError('Invalid today');
    const earliest=suggestedStart(p,target,'max'),latest=suggestedStart(p,target,'min');
    const chosen=parseDate(startOverride),base=chosen?iso(chosen<now?now:chosen):(earliest&&parseDate(earliest)>now?earliest:today);
    const result=schedule(p,base);
    return {...result,plan:p,target:parseDate(target)?target:null,suggestedEarliest:earliest,suggestedLatest:latest,
      tight:!!earliest&&earliest<today,targetPast:!!parseDate(target)&&target<today,
      meetsTarget:!!result.finishMax&&!!parseDate(target)&&result.finishMax<=target};
  }
  function duration(records,e,today){
    if(!e.required)return e.assessmentLine?(e.lines.length===1?(e.assessment==='design'?'60 minutes':'90 minutes'):'Assessment only'):'Choose treatments';
    const p=plan(records,e),s=schedule(p,today);

    const days=d=>Math.round((parseDate(d)-parseDate(today))/86400000);
    const months=p.stages.some(stage=>stage.timing.unit==='months'),divisor=months?30.4375:7;
    const min=Math.ceil(days(s.finishMin)/divisor),max=Math.ceil(days(s.finishMax)/divisor);
    return (min===max?min:min+'–'+max)+' '+(months?'months':'weeks');
  }
  function completionTimeline(records,e,today,delay=0,requestedTarget=''){
    const p=plan(records,e),now=parseDate(today);if(!now)throw new RangeError('Invalid today');
    const earliest=schedule(p,today);let offset=clamp(Math.round(Number(delay)||0),0,730),tooSoon=false;
    if(earliest.reliable&&parseDate(requestedTarget)){
      tooSoon=requestedTarget<earliest.finishMin;
      const suggested=suggestedStart(p,requestedTarget,'min');
      offset=suggested?clamp(Math.round((parseDate(suggested)-now)/86400000),0,730):0;
    }
    const result=schedule(p,iso(addDays(now,offset)));
    return {...result,plan:p,offset,tooSoon,earliestCompletion:earliest.finishMin,latestCompletion:schedule(p,iso(addDays(now,730))).finishMin};
  }
  return Object.freeze({VERSION,IDS,OPTIONS,parsePrice,recordFromFields,newState,normaliseState,allowedOptions,estimate,payment,finance,parseDate,iso,addDays,addMonths,plan,schedule,suggestedStart,timeline,duration,completionTimeline});
});

/* TDB Treatment Calculator v1.4.9 — shared inline/drawer controller. */
(function () {
  'use strict';
  if(window.TDBCalculator)return;
  const C=window.TDBCalculatorCore;if(!C)return;
  const PRICE_PATH='/dental-cost-lichfield';
  const SELECTOR='[data-tdb-calc-open],a[href$="#treatment-calculator"]';
  const STORAGE='tdb-treatment-estimate-v1';
  const TTL=4*60*60*1000;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currency=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:v%100?2:0}).format(v/100);
  const dateText=s=>s?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z')):'';
  const range=(low,high)=>low===high?currency(low):currency(low)+'–'+currency(high);
  const dateRange=(a,b)=>a===b?dateText(a):dateText(a)+' – '+dateText(b);
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const clock='<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path fill="currentColor" d="M128 28a100 100 0 1 0 100 100A100.11 100.11 0 0 0 128 28m0 192a92 92 0 1 1 92-92a92.1 92.1 0 0 1-92 92m60-92a4 4 0 0 1-4 4h-56a4 4 0 0 1-4-4V72a4 4 0 0 1 8 0v52h52a4 4 0 0 1 4 4"></path></svg>';
  const tag='<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path fill="currentColor" d="M241.91 137.42L142.59 38.1a13.94 13.94 0 0 0-9.9-4.1H40a6 6 0 0 0-6 6v92.69a13.94 13.94 0 0 0 4.1 9.9l99.32 99.32a14 14 0 0 0 19.8 0l84.69-84.69a14 14 0 0 0 0-19.8m-8.49 11.31l-84.69 84.69a2 2 0 0 1-2.83 0L46.59 134.1a2 2 0 0 1-.59-1.41V46h86.69a2 2 0 0 1 1.41.59l99.32 99.31a2 2 0 0 1 0 2.83M94 84a10 10 0 1 1-10-10a10 10 0 0 1 10 10"></path></svg>';
  let state=C.newState(),records=null,loadPromise=null,dialog=null,drawerView=null,lastTrigger=null,oldOverflow='',oldPadding='',scrollWasStopped=false;
  const views=[];let sequence=0;
  try{const stored=JSON.parse(sessionStorage.getItem(STORAGE)||'null');if(stored?.version===1&&Date.now()-stored.at<TTL)state=C.normaliseState(stored.state);else sessionStorage.removeItem(STORAGE);}catch(_){/* Storage is optional. */}
  function save(){try{sessionStorage.setItem(STORAGE,JSON.stringify({version:1,at:Date.now(),state}));}catch(_){}}
  function parseFeed(doc){
    const out=Object.create(null);
    doc.querySelectorAll('[data-tdb-calc-record]').forEach(el=>{
      const id=el.getAttribute('data-tdb-calc-record');if(!/^[0-9a-f]{24}$/.test(id||''))return;
      const f={record:id};for(const key of ['name','label','price','tooltip','min','max','unit','deposit','tier1','tier2','tier3','tier4','tier5','tier1friendly','tier2friendly','tier3friendly','tier1min','tier1max','tier2min','tier2max','tier3min','tier3max'])f[key]=el.getAttribute('data-'+key)||'';
      for(const key of ['whitening','hygiene'])f[key]=[...doc.querySelectorAll('[data-tdb-calc-included="'+key+'"]')].some(marker=>marker.getAttribute('data-record')===id&&!marker.classList.contains('w-condition-invisible'));
      out[id]=C.recordFromFields(f);
    });
    return out;
  }
  function getRecords(){
    if(records)return Promise.resolve(records);if(loadPromise)return loadPromise;
    const local=parseFeed(document);
    if(local[C.IDS.assessment]){records=local;return Promise.resolve(records);}
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    loadPromise=fetch(PRICE_PATH,{credentials:'omit',cache:'no-cache',signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Pricing unavailable');return r.text();}).then(html=>{
      const parsed=parseFeed(new DOMParser().parseFromString(html,'text/html'));
      if(!parsed[C.IDS.assessment])throw Error('Pricing feed unavailable');records=parsed;return records;
    }).finally(()=>{clearTimeout(timeout);loadPromise=null;});return loadPromise;
  }
  function configFrom(el){
    const host=el.closest('[data-tdb-calc-entry]')||el,config={preselect:el.getAttribute('data-treatment')||host.getAttribute('data-treatment')||''};
    const nativeConfig=host.querySelector('[data-tdb-calc-config]');
    for(const key of ['cosmetic','restorative','finance']){const marker=host.querySelector('[data-tdb-calc-toggle="'+key+'"]');config[key]=nativeConfig?!!marker&&!marker.classList.contains('w-condition-invisible'):el.getAttribute('data-'+key)!=='false';}
    return config;
  }
  function renderAll(except){for(const view of views)if(view!==except)view.render();save();}
  function priceText(e){return !e.lines.length?'Choose your treatments':(!e.complete?'Priced items: ':e.starting&&e.min===e.max?'From ':'')+range(e.min,e.max);}
  function recordPrice(r){return r?.valid?(r.from?'From ':'')+currency(r.min)+(r.unit?' / '+r.unit:''):'Price to confirm';}
  function name(o){return o.key==='replacement'?'Metal filling replacement':records[C.IDS[o.record||o.key]]?.label||o.key;}
  function contextual(view,config){
    const hasEstimate=Object.keys(state.selected).length||state.assessment!=='none';
    view.config={...config};view.context=null;
    const restricted=C.estimate(records,state,config).hiddenSelections.length>0;
    if(hasEstimate&&(restricted||config.preselect&&!state.selected[config.preselect])){
      view.context={...config};view.config={...config,cosmetic:true,restorative:true};
    }else if(!hasEstimate&&config.preselect){
      const o=C.allowedOptions(config).find(o=>o.key===config.preselect);
      if(o){state.categories=[...new Set([...state.categories,o.category])];state.selected[o.key]={qty:1,tier:null};}
    }
  }

  const arrow='<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="m18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"/></svg>';
  const chevron='<span class="tdbc-chevron" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false"><path fill="currentColor" d="M16.5303 20.8839C16.2374 21.1768 15.7626 21.1768 15.4697 20.8839L7.82318 13.2374C7.53029 12.9445 7.53029 12.4697 7.82318 12.1768L8.17674 11.8232C8.46963 11.5303 8.9445 11.5303 9.2374 11.8232L16 18.5858L22.7626 11.8232C23.0555 11.5303 23.5303 11.5303 23.8232 11.8232L24.1768 12.1768C24.4697 12.4697 24.4697 12.9445 24.1768 13.2374L16.5303 20.8839Z"/></svg></span>';
  // Smile Gallery filter control: light strokes, rotating mark and close cross.
  const infoIcon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><g class="tdbc-info-mark"><path d="M12 10.5V17M10.5 10.5H12M10.5 17h3"/><circle cx="12" cy="7" r=".6" fill="currentColor" stroke="none"/></g><path class="tdbc-info-close-mark" d="M6 6l12 12M18 6 6 18"/></svg>';
  const tip=(id,label,text)=>'<div class="tdbc-info" data-node="info-'+id+'"><button type="button" class="tdbc-info-button" data-action="info" aria-label="'+esc(label)+'" aria-expanded="false" aria-controls="'+id+'-tip">'+infoIcon+'</button><div class="tdbc-info-panel text-size-small" role="tooltip" id="'+id+'-tip" aria-hidden="true" inert>'+esc(text)+'</div></div>';
  const actionButton=(action,label,up=false,withArrow=true)=>'<button type="button" class="button '+(withArrow?'is-icon ':'')+'w-inline-block" data-action="'+action+'"><span>'+label+'</span>'+(withArrow?'<span class="icon-embed-xxsmall '+(up?'is-up ':'')+'w-embed">'+arrow+'</span>':'')+'</button>';
  const lineQuantity=l=>l.qty>1?' × '+l.qty+' '+(l.record?.unit==='arch'?'arches':l.record?.unit==='surface'?'surfaces':l.key==='gumline'?'areas':'teeth'):'';
  const check=on=>'<span aria-hidden="true" class="w-checkbox-input w-checkbox-input--inputType-custom form_checkbox-icon '+(on?'w--redirected-checked':'')+'"></span>';
  const step=(n,label,intro="",help=false)=>'<div class="tdbc-step-header"><h3 class="tdbc-step-heading heading-style-h4"><span class="tdbc-number text-size-tiny">'+n+'</span><span>'+label+'</span></h3><div class="tdbc-step-intro text-size-small'+(help?' tdbc-help':'')+'"'+(!intro?' aria-hidden="true"':'')+'>'+intro+'</div></div>';
  const expand=(key,on,html)=>'<div class="tdbc-expand '+(on?'is-expanded':'')+'" data-node="expand-'+key+'" data-panel="'+key+'" aria-hidden="'+!on+'" '+(on?'':'inert')+'><div class="tdbc-expand-inner"><div class="tdbc-expand-body">'+html+'</div></div></div>';
  // Keep real controls and expansion panels mounted while their values change.
  // This preserves keyboard focus, slider drags and the site's open/close motion.
  function patch(parent,html){
    const template=document.createElement('template');template.innerHTML=html;
    const key=n=>n.nodeType===1?(n.getAttribute('data-node')||n.id||n.getAttribute('data-control')):null;
    function children(dst,src){
      const old=[...dst.childNodes],byKey=new Map(old.filter(key).map(n=>[key(n),n]));let i=0;
      for(const fresh of [...src.childNodes]){
        const k=key(fresh),at=dst.childNodes[i];let node=k?byKey.get(k):at&&!key(at)&&at.nodeType===fresh.nodeType&&at.nodeName===fresh.nodeName?at:null;
        if(!node||node.nodeName!==fresh.nodeName){node=fresh.cloneNode(true);dst.insertBefore(node,at||null);if(node.nodeType===1){const panels=[...(node.matches('.tdbc-expand.is-expanded')?[node]:[]),...node.querySelectorAll('.tdbc-expand.is-expanded')];panels.forEach(el=>{el.classList.add('is-entering');requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.remove('is-entering')));});}}
        else{if(node!==at)dst.insertBefore(node,at||null);if(node.nodeType===3){if(node.textContent!==fresh.textContent)node.textContent=fresh.textContent;}else if(node.nodeType===1){
          for(const a of [...node.attributes])if(!fresh.hasAttribute(a.name)&&!['data-dd-ready','style'].includes(a.name))node.removeAttribute(a.name);
          for(const a of fresh.attributes)if(node.getAttribute(a.name)!==a.value)node.setAttribute(a.name,a.value);
          if(node instanceof HTMLInputElement){if(node.value!==fresh.value)node.value=fresh.value;node.checked=fresh.checked;node.disabled=fresh.disabled;}
          children(node,fresh);
        }}i++;
      }
      while(dst.childNodes.length>i)dst.lastChild.remove();
    }
    children(parent,template.content);
  }
  let focusedView=null,focusEpoch=0;
  function releaseFocus(){if(!focusedView)return;focusedView.root.classList.remove('is-focused');document.documentElement.classList.remove('tdbc-chrome-away');focusedView=null;++focusEpoch;window.TDBNavScroll?.release();}
  function focusView(view,restore=false){
    if(view.suspended)return;
    if(focusedView===view&&!restore)return;
    const epoch=++focusEpoch;
    if(focusedView)focusedView.root.classList.remove('is-focused');focusedView=view;
    view.root.classList.add('is-focused');document.documentElement.classList.add('tdbc-chrome-away');
    const nav=document.querySelector('.navbar10_component');
    if(nav){const b=nav.getBoundingClientRect(),parts=[nav,...nav.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')];nav.style.setProperty('--tdb-slider-nav-away',Math.max(nav.offsetHeight,...parts.filter(p=>p.getClientRects().length).map(p=>p.getBoundingClientRect().bottom-b.top))+'px');}
    window.TDBNavScroll?.focus(()=>{if(epoch===focusEpoch&&!view.visible&&view.mode!=='drawer')releaseFocus();},()=>view.visible||view.mode==='drawer');
  }
  function syncViewportFocus(){
    const active=dialog?.open&&!drawerView.suspended?drawerView:views.find(v=>v.mode==='inline'&&v.visible&&!v.suspended);
    if(active)focusView(active);else releaseFocus();
  }
  function watchViewport(view){
    if(view.mode!=='inline')return;
    const update=visible=>{view.visible=visible;if(!visible)view.suspended=false;syncViewportFocus();};
    if('IntersectionObserver'in window){view.observer=new IntersectionObserver(entries=>update(entries[0].isIntersecting),{threshold:0});view.observer.observe(view.root);}
    else{let pending=false;const check=()=>{pending=false;const b=view.root.getBoundingClientRect();update(b.height>0&&b.top<innerHeight&&b.bottom>0);};const queue=()=>{if(!pending){pending=true;requestAnimationFrame(check);}};window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue,{passive:true});check();}
  }
  function closeTooltips(except){document.querySelectorAll('.tdbc-info.is-open').forEach(info=>{if(info===except)return;info.classList.remove('is-open');info.querySelector('button').setAttribute('aria-expanded','false');const p=info.querySelector('[role="tooltip"]');p.setAttribute('aria-hidden','true');p.inert=true;});}

  class View {
    constructor(root,config,mode){this.root=root;this.config=config;this.mode=mode;this.id='tdbc-'+(++sequence);this.context=null;this.ready=false;this.breakdown=true;this.visible=false;this.suspended=false;this.timingWarning=false;this.dateDrag=null;this.stageOpen=new Set();this.optionClosed=new Set();this.optionPreview=new Set();this.optionDrafts={};this.activeStage='assessment';this.timelineManual=false;this.timelineFrame=0;this.bridalOpen=false;this.liveText=null;this.liveAnimation=null;
      root.classList.add('tdb-calc','padding-global');root.addEventListener('change',e=>this.change(e));root.addEventListener('input',e=>this.input(e));root.addEventListener('click',e=>this.click(e));
      root.addEventListener('pointerdown',event=>{this.suspended=false;focusView(this);if(event.target.dataset.range==='completion')this.dateDrag={pointer:event.pointerId,x:event.clientX,slider:event.target};},{passive:true});
      root.addEventListener('focusin',()=>{this.suspended=false;focusView(this);});
      root.addEventListener('keydown',event=>{if(event.target.dataset.range==='completion'&&Number(event.target.value)===0&&['ArrowLeft','ArrowDown','Home'].includes(event.key))this.showTimingWarning();});
      window.addEventListener('pointermove',event=>{const d=this.dateDrag;if(d&&event.pointerId===d.pointer&&Number(d.slider.value)===0&&event.clientX<d.x-8)this.showTimingWarning();},{passive:true});
      window.addEventListener('pointerup',()=>{this.dateDrag=null;},{passive:true});window.addEventListener('pointercancel',()=>{this.dateDrag=null;},{passive:true});
      const followTimeline=()=>this.queueTimelineFocus(true);window.addEventListener('scroll',followTimeline,{passive:true});window.addEventListener('resize',followTimeline,{passive:true});if(mode==='drawer')dialog.addEventListener('scroll',followTimeline,{passive:true});
      views.push(this);watchViewport(this);}
    setTimingWarning(open){
      this.timingWarning=open;
      this.root.querySelector('[data-action=sooner]')?.setAttribute('aria-expanded',String(open));
      const panel=this.root.querySelector('[data-panel=deadline]');
      if(panel){panel.classList.toggle('is-expanded',open);panel.setAttribute('aria-hidden',String(!open));panel.inert=!open;}
      this.queueTimelineFocus();
    }
    showTimingWarning(){this.setTimingWarning(true);}
    dismissTimingWarning(){this.setTimingWarning(false);}
    queueTimelineFocus(fromScroll=false){
      if(fromScroll)this.timelineManual=false;
      if(this.timelineFrame)return;
      this.timelineFrame=requestAnimationFrame(()=>{this.timelineFrame=0;this.updateTimelineFocus();});
    }
    updateTimelineFocus(){
      if(!this.ready||this.mode==='drawer'&&!dialog?.open)return;
      const rows=[...this.root.querySelectorAll('.tdbc-timeline-row')];if(!rows.length)return;
      const target=innerHeight*.42,top=this.root.querySelector('.tdbc-live')?.offsetHeight||0;
      const full=Math.max(48,innerHeight*.08),reach=Math.max(180,innerHeight*.32);
      // Read all positions before writing styles. Each row fades independently,
      // so neighbouring stages overlap instead of sharing one on/off highlight.
      const positions=rows.map(row=>{const b=row.getBoundingClientRect();return {row,b,distance:Math.abs(b.top+Math.min(b.height,80)/2-target)};});
      if(!this.timelineManual){
        const visible=positions.filter(x=>x.b.bottom>top&&x.b.top<innerHeight);
        visible.sort((a,b)=>a.distance-b.distance);
        if(visible[0])this.activeStage=visible[0].row.dataset.stage;
      }
      for(const {row,distance} of positions){
        const current=row.dataset.stage===this.activeStage;
        const progress=Math.max(0,Math.min(1,(reach-distance)/(reach-full)));
        const emphasis=this.timelineManual&&current?1:progress*progress*(3-2*progress);
        row.style.setProperty('--tdbc-stage-opacity',(.5+.5*emphasis).toFixed(3));
        row.style.setProperty('--tdbc-stage-emphasis',(emphasis*100).toFixed(1)+'%');
        row.classList.toggle('is-current',current);const button=row.querySelector('.tdbc-stage-toggle');if(current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
      }
    }
    animateLive(value){
      const changed=this.liveText!==null&&this.liveText!==value;this.liveText=value;
      if(!changed||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
      const el=this.root.querySelector('[data-output="live"]');if(!el?.animate)return;
      this.liveAnimation?.cancel();this.liveAnimation=el.animate([{opacity:.55,transform:'translateY(2px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.4,0,.2,1)'});
    }
    scrollToStart(){const header=this.root.querySelector('.tdbc-header');if(this.mode==='drawer'){dialog.scrollTop=0;}else if(window.lenis?.scrollTo)window.lenis.scrollTo(this.root,{immediate:true,offset:0});else this.root.scrollIntoView?.({behavior:'instant',block:'start'});header?.focus({preventScroll:true});syncViewportFocus();}
    async init(){this.root.setAttribute('aria-busy','true');try{await getRecords();this.ready=true;contextual(this,this.config);this.render();renderAll(this);}catch(_){this.root.innerHTML='<div class="tdbc-shell"><h2 class="heading-style-h3">Explore your treatment costs</h2><p>We couldn’t load the current prices. Please try again or view our fee guide.</p><button type="button" class="button is-secondary" data-action="retry">Try again</button> <a href="'+PRICE_PATH+'">View fees</a></div>';}finally{this.root.removeAttribute('aria-busy');}}
    render(){
      if(!this.ready)return;
      const e=C.estimate(records,state,this.config),id=this.id;
      if(e.hiddenSelections.length&&!this.context){this.context={...this.config};this.config.cosmetic=this.config.restorative=true;return this.render();}
      const active=state.categories.length>0,selected=e.selected.length,hasEstimate=active&&e.lines.length>0,available=C.allowedOptions(this.config);
      const form='<section class="tdbc-step" data-node="step-1" aria-labelledby="'+id+'-explore"><div id="'+id+'-explore">'+step('01','What would you like to explore?','Choose one or both.',true)+'</div><div class="tdbc-categories">'+
      ['cosmetic','restorative'].filter(k=>this.config[k]).map(k=>'<label class="tdbc-category form_checkbox '+(state.categories.includes(k)?'is-selected':'')+'"><input type="checkbox" data-control="category-'+k+'" data-category="'+k+'" '+(state.categories.includes(k)?'checked':'')+'>'+check(state.categories.includes(k))+'<span><span class="text-style-tagline-restored">'+(k==='cosmetic'?'Cosmetic':'Restorative')+'</span><small class="text-size-tiny">'+(k==='cosmetic'?'Improve my smile':'Restore my teeth')+'</small></span></label>').join('')+'</div></section>'+
      expand('treatments',active,'<section class="tdbc-step" data-node="step-2">'+step('02','Shape your estimate','Explore freely. Your dentist will help confirm the right treatments.',true)+['cosmetic','restorative'].filter(k=>state.categories.includes(k)&&this.config[k]).map(k=>'<section class="tdbc-treatment-group" data-node="group-'+k+'" aria-label="'+k+' treatments"><div role="heading" aria-level="4" class="text-style-tagline-restored tdbc-dd-fade">'+(k==='cosmetic'?'Cosmetic treatments':'Restorative treatments')+'</div>'+available.filter(o=>o.category===k).map(o=>this.option(o,e)).join('')+'</section>').join('')+'</section>')+
      expand('journey',hasEstimate,hasEstimate?(selected?this.timelineControls(e):'')+this.assessment(e)+(e.cosmetic?this.hygiene(e):'')+this.summary(e):'')+
      (active?'<footer class="tdbc-footnote" data-node="footnote"><p class="text-size-tiny">A guide to possibilities, subject to assessment and your confirmed treatment plan. Your selections stay in this tab for up to four hours.</p><div class="tdbc-actions">'+actionButton('reset','Restart estimate',true)+actionButton('start-assessment','Prefer to start with an assessment?',false,false)+'</div></footer>':'');
      patch(this.root,'<div class="tdbc-shell container-large padding-section-large" data-node="shell"><header class="tdbc-header" data-node="header" tabindex="-1"><p class="text-style-tagline-restored tdbc-dd-fade">YOUR SMILE, YOUR POSSIBILITIES</p><h2 class="heading-style-h3"'+(this.mode==='drawer'?' id="tdbc-dialog-title"':'')+'>Explore your treatment costs</h2><p class="text-size-small">Start with what matters to you. We’ll bring together a guide to your investment and timing.</p></header>'+
      (this.context?'<div class="tdbc-notice text-size-small" data-node="context"><p>Your existing estimate is saved. Continue with it, or start with the options from this page.</p><div class="tdbc-actions"><button type="button" data-action="keep" class="tdbc-text-button">Keep my estimate</button><button type="button" data-action="context" class="tdbc-text-button">Start with these options</button></div></div>':'')+
      ('<div class="tdbc-live '+(hasEstimate?'has-estimate':'')+'" data-node="live" aria-hidden="'+!hasEstimate+'" '+(hasEstimate?'':'inert')+'><button type="button" class="tdbc-live-button" data-action="estimate" aria-label="View your full estimate"><span class="tdbc-live-copy"><span class="text-size-tiny">Your estimate</span><span class="tdbc-live-value text-size-small">'+tag+'<strong data-output="live">'+esc(priceText(e))+'</strong></span></span><span class="tdbc-live-copy"><span class="text-size-tiny">Estimated duration</span><span class="tdbc-live-value text-size-small">'+clock+'<span data-output="duration">'+esc(C.duration(records,e,today()))+'</span></span></span><span class="icon-embed-xxsmall is-down w-embed tdbc-scroll-arrow">'+arrow+'</span></button>'+(this.mode==='drawer'?'<button type="button" class="tdbc-live-close" data-action="close" aria-label="Close calculator">×</button>':'')+'</div>')+'<div class="tdbc-main" data-node="main">'+form+'</div></div><footer class="tdbc-section-footer" data-node="section-footer"><div class="container-large"><div class="max-width-xsmall"><p class="text-style-tagline-restored">We believe everyone deserves to feel good about their smile</p></div></div></footer>');
      this.outputs();
    }
    option(o,e){
      const r=records[C.IDS[o.record||o.key]],v=state.selected[o.key]||this.optionDrafts[o.key],on=!!state.selected[o.key],included=o.key==='whitening'&&e.whitenIncluded,label=name(o),rid=this.id+'-'+o.key,unit=r?.unit||(o.quantity?'tooth':'');
      const complexity=['aligners','bonding','veneers'].includes(o.key)&&r?.tierLabels?.some(Boolean),hasControls=o.quantity||complexity,expanded=!included&&(on?!this.optionClosed.has(o.key):this.optionPreview.has(o.key));
      const quoted=o.key==='replacement'&&r?.valid&&r.tiers[2]?currency(r.tiers[2])+(unit?' / '+unit:''):recordPrice(r);
      const row='<div class="tdbc-option-row"><label class="tdbc-option-label form_checkbox" for="'+rid+'"><input id="'+rid+'" type="checkbox" data-control="select-'+o.key+'" data-select="'+o.key+'" '+(on||included?'checked ':'')+(included?'disabled ':'')+'>'+check(on||included)+'<span><span class="text-size-small">'+esc(label)+'</span><small class="text-size-tiny">'+(included?'Included with your aligners':esc(quoted))+'</small></span></label>'+tip(rid,'About '+label,(r?.tooltip||'Your dentist will confirm suitability, fees and the treatment sequence at your assessment.')+(o.key==='replacement'?' Count the surfaces to be replaced separately from any new fillings.':''))+(hasControls?'<button type="button" class="tdbc-option-expand" data-action="option" data-key="'+o.key+'" aria-label="Options for '+esc(label)+'" aria-expanded="'+expanded+'" aria-controls="'+rid+'-controls">'+chevron+'</button>':'<span class="tdbc-option-spacer" aria-hidden="true"></span>')+'</div>';
      const quantity=o.quantity?'<label class="text-size-small" for="'+rid+'-qty">'+(unit==='surface'?'Surfaces to restore':o.key==='gumline'?'Number of areas':'Number of teeth')+'</label><div class="tdbc-quantity-row"><div class="tdbc-quantity"><button type="button" data-action="minus" data-key="'+o.key+'" aria-label="Fewer '+esc(label)+'" '+((v?.qty||1)<=1?'disabled':'')+'>−</button><input id="'+rid+'-qty" data-control="qty-'+o.key+'" data-qty="'+o.key+'" type="number" inputmode="numeric" min="1" max="'+(unit==='surface'?160:32)+'" step="1" value="'+(v?.qty||1)+'"><button type="button" data-action="plus" data-key="'+o.key+'" aria-label="More '+esc(label)+'">+</button></div>'+(o.category==='cosmetic'?tip(rid+'-quantity',o.key==='gumline'?'How many areas should I include?':'How many teeth should I include?',o.key==='gumline'?'Count one area for each tooth with an exposed or worn gumline you would like us to look at. The fee is per tooth; this is gumline bonding, rather than gum contouring.':'Think about the teeth you would like to improve, or those you see when you smile. A typical smile treatment may cover six front teeth (3–3) or eight (4–4). Your dentist will help confirm the right number.'): '')+'</div>'+(unit==='surface'?'<p class="tdbc-help text-size-tiny">One tooth may need several surfaces restored. If unsure, use one surface for a starting guide.</p>':o.key==='gumline'?'<p class="tdbc-help text-size-tiny">One area per tooth. The estimate uses the published per-tooth fee.</p>':''):'';
      const trial=records[C.IDS.trial],arches=v?.arches||['upper'];
      const archOptions=o.key==='veneers'?'<fieldset class="tdbc-complexity tdbc-arches"><legend class="text-size-small">Which arches are you considering?</legend>'+['upper','lower'].map(arch=>'<label class="tdbc-choice form_checkbox text-size-small"><input type="checkbox" data-control="arch-'+arch+'" data-arch="'+arch+'" '+(arches.includes(arch)?'checked ':'')+(arches.includes(arch)&&arches.length===1?'disabled':'')+'>'+check(arches.includes(arch))+'<span>'+arch[0].toUpperCase()+arch.slice(1)+' arch</span></label>').join('')+'<p class="tdbc-help text-size-tiny">'+esc(trial?.label||'Smile Trial')+' · '+esc(recordPrice(trial))+'. Added for each selected arch. Keep the total number of veneers in the teeth box above.</p></fieldset>':'';
      const choices=complexity?'<fieldset class="tdbc-complexity"><legend class="text-size-small">'+(o.key==='aligners'?'What would you like to improve?':'What changes do you have in mind?')+'</legend>'+r.tierLabels.map((label,i)=>label&&r.tiers[i]?'<label class="tdbc-choice form_checkbox text-size-small"><input type="radio" name="'+rid+'-complexity" data-control="tier-'+o.key+'-'+i+'" data-tier="'+o.key+'" value="'+i+'" '+(v?.tier===i?'checked':'')+'>'+check(v?.tier===i)+'<span>'+esc(label)+'</span></label>':'').join('')+'<p class="tdbc-help text-size-tiny">Choose the closest description. Your dentist will confirm what’s right for you.</p></fieldset>':'';
      return '<div class="tdbc-option '+(on||included?'is-selected':'')+'" data-node="option-'+o.key+'">'+row+(hasControls?expand('option-'+o.key,expanded,'<div class="tdbc-option-controls" id="'+rid+'-controls">'+quantity+choices+archOptions+'</div>'):'')+'</div>';
    }
    assessment(e){const a=records[C.IDS.assessment],d=records[C.IDS.design];return '<section class="tdbc-step tdbc-assessment" data-node="assessment">'+step(e.required?'04':'03',esc(a?.label||'Signature Assessment'),'Smile Design and a comprehensive examination, together with Dr Keely.')+'<ul class="tdbc-included text-size-small">'+['Smile Design','Comprehensive examination & appropriate diagnostics','Itemised plan, costs & written report'].map(t=>'<li><span class="tdbc-included-mark" aria-hidden="true"></span><span>'+t+'</span></li>').join('')+'</ul><div class="tdbc-assessment-price"><strong class="heading-style-h4">'+esc(recordPrice(a))+'</strong><span class="text-size-tiny">'+esc(a?.bookingDeposit!==null&&a?.bookingDeposit!==undefined?currency(a.bookingDeposit)+' booking deposit, included in the total':'Booking details confirmed with your appointment')+'</span></div>'+(e.required?'<p class="tdbc-help text-size-tiny">Included once in your estimate. Smile Design and your examination are bundled together.</p>':'<label class="tdbc-manual form_checkbox text-size-small"><input type="checkbox" data-control="assessment" data-assessment="signature" '+(state.assessment==='signature'?'checked':'')+'>'+check(state.assessment==='signature')+'<span>Include Signature Assessment</span></label>'+(d?.valid?'<label class="tdbc-manual form_checkbox text-size-small"><input type="checkbox" data-control="design" data-assessment="design" '+(state.assessment==='design'?'checked':'')+'>'+check(state.assessment==='design')+'<span>Explore Smile Design only · '+esc(recordPrice(d))+'</span></label>':''))+'</section>';}
    hygiene(e){const r=records[C.IDS.hygiene];return '<section class="tdbc-step" data-node="hygiene">'+step('05','Healthy foundations','We’ll review your gum health before cosmetic treatment.')+(e.hygieneIncluded?'<p class="text-size-small">Airflow® hygiene is included with your aligner package.</p>':'<label class="tdbc-manual form_checkbox text-size-small"><input type="checkbox" data-control="hygiene" data-hygiene '+(state.hygiene?'checked':'')+'>'+check(state.hygiene)+'<span>Add a hygiene allowance · '+esc(recordPrice(r))+'</span></label><p class="tdbc-help text-size-tiny">Recommended where needed. Add this allowance to include it in your estimate.</p>')+'<p class="tdbc-help text-size-tiny">Any additional periodontal care will be discussed after assessment.</p></section>';}
    summary(e){return '<section class="tdbc-summary" data-output="summary" id="'+this.id+'-estimate" data-node="estimate" tabindex="-1" aria-label="Your estimated investment"><div class="tdbc-summary-total"><p class="text-style-tagline-restored">Your estimated investment</p><div class="tdbc-total heading-style-h3" data-output="total">'+esc(priceText(e))+'</div><p class="tdbc-summary-duration text-size-small">'+clock+'<span>Estimated duration: <span data-output="duration-summary">'+esc(C.duration(records,e,today()))+'</span></span></p>'+(e.required?'<p class="tdbc-help text-size-tiny">Includes two weeks after your assessment for planning. Timing is confirmed with your treatment plan.</p>':'')+'</div><div class="tdbc-summary-details"><div class="tdbc-breakdown"><button type="button" class="tdbc-disclosure text-style-tagline-restored" data-action="breakdown" aria-expanded="'+this.breakdown+'" aria-controls="'+this.id+'-breakdown">Your breakdown'+chevron+'</button>'+expand('breakdown',this.breakdown,'<ul class="text-size-small" id="'+this.id+'-breakdown">'+e.lines.map(l=>'<li><span>'+esc(l.label)+(l.qty>1?' <small class="text-size-tiny">'+esc(lineQuantity(l))+'</small>':'')+'</span><strong>'+(l.included?'Included':l.min===null?'To confirm':esc(range(l.min,l.max)))+'</strong></li>').join('')+'</ul>')+'</div>'+(!e.complete?'<p class="tdbc-notice text-size-small">Some prices need confirmation: '+esc(e.missing.join(', '))+'. The subtotal excludes these items.</p>':'')+(e.cosmetic&&!e.hygieneIncluded&&!state.hygiene?'<p class="tdbc-help text-size-tiny">Hygiene, if needed, is additional.</p>':'')+(this.config.finance?this.financeControls(e):'')+'<a class="button is-icon is-secondary is-alternate tdbc-vip w-inline-block" href="/vip" data-action="vip"><span>Join VIP</span><span class="icon-embed-xxsmall is-up w-embed">'+arrow+'</span></a><p class="tdbc-help text-size-tiny">Discuss your options and take the next step with us.</p></div></section>';}
    financeControls(e){const f=C.finance(e,state.deposit,state.term);if(!f)return '<div class="tdbc-finance tdbc-finance-unavailable" data-node="finance"><div class="tdbc-info tdbc-finance-info" data-node="info-finance"><button type="button" class="tdbc-info-button tdbc-finance-disabled form_checkbox text-size-small" data-action="info" aria-label="Why finance is unavailable for this estimate" aria-expanded="false" aria-controls="'+this.id+'-finance-help">'+check(false)+'<span>Explore 0% finance<small class="text-size-tiny">From £250, over 3–12 months</small></span>'+infoIcon+'</button><div class="tdbc-info-panel text-size-small" id="'+this.id+'-finance-help" role="tooltip" aria-hidden="true" inert>Finance needs at least £250 to borrow after the '+esc(currency(e.assessmentLine?.min||45000))+' assessment payment. '+(e.complete?'Add further treatment to explore an illustration.':'We also need to confirm all selected prices first.')+'</div></div></div>';return '<div class="tdbc-finance" data-node="finance"><label class="tdbc-manual form_checkbox tdbc-finance-toggle text-size-small"><input type="checkbox" data-control="finance" data-finance '+(state.finance?'checked':'')+' aria-expanded="'+state.finance+'" aria-controls="'+this.id+'-finance">'+check(state.finance)+'<span>Finance available · explore 0%<small class="text-size-tiny">From £250, over 3–12 months</small></span>'+chevron+'</label>'+expand('finance',state.finance,'<div class="tdbc-finance-controls" id="'+this.id+'-finance">'+(f?'<label class="text-size-small" for="'+this.id+'-deposit">Upfront payment <output data-output="deposit">'+esc(currency(f.deposit))+'</output></label><input id="'+this.id+'-deposit" type="range" min="'+f.minimumDeposit+'" max="'+f.limit+'" step="100" value="'+f.deposit+'" data-control="deposit" data-range="deposit" aria-valuetext="'+esc(currency(f.deposit))+'"><div class="tdbc-range-labels text-size-tiny"><span>'+esc(currency(f.minimumDeposit))+' minimum</span><span>'+esc(currency(f.limit))+'</span></div><label class="tdbc-sr" for="'+this.id+'-deposit-value">Upfront payment in pounds</label><input id="'+this.id+'-deposit-value" class="form_input" type="number" min="'+f.minimumDeposit/100+'" max="'+f.limit/100+'" step="1" value="'+f.deposit/100+'" data-control="deposit-number" data-deposit-number><p class="tdbc-help text-size-tiny">Includes your '+esc(currency(f.assessment))+' Signature Assessment, counted once in the total.</p><label class="text-size-small" for="'+this.id+'-term">Repayment term <output data-output="term">'+state.term+' months</output></label><input id="'+this.id+'-term" type="range" min="3" max="12" step="1" value="'+state.term+'" data-control="term" data-range="term" aria-valuetext="'+state.term+' months"><div class="tdbc-range-labels text-size-tiny"><span>3 months</span><span>12 months</span></div><div data-output="finance"></div><p class="tdbc-help text-size-tiny">Illustration at 0% interest, subject to eligibility and lender approval. Your confirmed treatment plan sets the final amount.</p>':'<p class="text-size-small">Finance illustrations need complete pricing and at least £250 remaining after your assessment payment.</p>')+'</div>')+'</div>';}
    timelineControls(e){
      const t=C.completionTimeline(records,e,today(),state.delay),id=this.id;
      const wedding='<div class="tdbc-bridal-tip"><button type="button" class="tdbc-disclosure tdbc-bridal-toggle" data-action="bridal" aria-expanded="'+this.bridalOpen+'" aria-controls="'+id+'-bridal"><span><span class="tdbc-diamond" aria-hidden="true">◇</span> Planning a wedding?</span>'+chevron+'</button>'+expand('bridal',this.bridalOpen,'<p id="'+id+'-bridal">Aim to finish your smile treatment before your makeup trials where possible. The shade of your teeth can influence the balance of your makeup, so it helps to see the finished look together.</p>')+'</div>';
      const warning='<div id="'+id+'-deadline" class="tdbc-timing-warning text-size-small"><p>Your selected plan needs a little more time. We’re no strangers to deadlines: being based at a wedding venue, we see plenty of brides and grooms and have become experienced at exploring what may be possible for the day that matters. Let’s talk about the date, your priorities and the options for getting you closer to your smile in time.</p>'+wedding+'</div>';
      return '<section class="tdbc-step" data-node="timeline">'+step('03','A date to look forward to')+'<div class="tdbc-target-card"><label class="text-style-tagline-restored" for="'+id+'-target">Target completion date*</label><div class="tdbc-target-field heading-style-h4"><output data-output="target-display" aria-hidden="true">'+esc(dateText(t.finishMin))+'</output><input class="form_input tdbc-target-date" id="'+id+'-target" type="date" data-control="target" data-date="target" value="'+t.finishMin+'" min="'+t.earliestCompletion+'" max="'+t.latestCompletion+'"></div><div class="tdbc-completion-note text-size-small"><p data-output="completion-range"></p><p class="tdbc-completion-reserve" aria-hidden="true">Earliest estimated finish. Your plan may take until 28 September 2099.</p></div><div class="tdbc-date-controls"><label class="tdbc-sr" for="'+id+'-date-slider">Move your target completion later</label><input id="'+id+'-date-slider" type="range" data-control="date-slider" data-range="completion" min="0" max="730" step="1" value="'+t.offset+'" aria-valuetext="'+esc(dateText(t.finishMin))+'"><div class="tdbc-range-labels text-size-tiny"><span>As soon as possible</span><span>Later</span></div></div><div class="tdbc-deadline-dock">'+'<button type="button" class="tdbc-disclosure tdbc-sooner-toggle text-size-small" data-action="sooner" aria-expanded="'+this.timingWarning+'" aria-controls="'+id+'-deadline"><span>Need it sooner?</span>'+chevron+'</button>'+expand('deadline',this.timingWarning,warning)+'</div><p class="tdbc-help text-size-tiny">*A little direction while you explore, rather than a promise of a date. Your teeth, healing, refinements and appointment availability all play a part. We’ll talk through what’s realistic together at your assessment.</p></div><div data-output="timeline"></div></section>';
    }
    outputs(){
      const e=C.estimate(records,state,this.config),f=C.finance(e,state.deposit,state.term);
      if(f&&state.deposit!==f.deposit){state.deposit=f.deposit;save();}
      const set=(key,value)=>{const el=this.root.querySelector('[data-output="'+key+'"]');if(el&&el.textContent!==value)el.textContent=value;};
      set('live',priceText(e));this.animateLive(priceText(e));set('total',priceText(e));set('duration',C.duration(records,e,today()));set('duration-summary',C.duration(records,e,today()));set('deposit',currency(f?.deposit||0));set('term',state.term+' months');
      const facts=this.root.querySelector('[data-output="finance"]');if(facts&&f)patch(facts,'<div class="tdbc-summary-monthly"><span class="text-size-tiny">0% over '+state.term+' months</span><strong class="heading-style-h4">'+esc(range(f.low.monthly,f.high.monthly))+'<small class="text-size-small"> / month</small></strong></div><dl class="tdbc-finance-facts text-size-small">'+[['Total estimate',range(e.min,e.max)],['Upfront, including assessment',currency(f.deposit)],['Amount financed',range(f.low.balance,f.high.balance)],['Interest charges',currency(0)],['Final monthly payment',range(f.low.final,f.high.final)]].map(([a,b])=>'<div><dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd></div>').join('')+'</dl>');
      const t=C.completionTimeline(records,e,today(),state.delay),target=this.root.querySelector('[data-date="target"]'),slider=this.root.querySelector('[data-range="completion"]');
      if(target&&t.reliable){target.value=t.finishMin;target.min=t.earliestCompletion;target.max=t.latestCompletion;}
      if(slider){slider.value=String(t.offset);slider.setAttribute('aria-valuetext',dateText(t.finishMin));}
      set('target-display',dateText(t.finishMin));
      set('completion-range',t.finishMin===t.finishMax?'Earliest estimated finish for your selected plan.':'Earliest estimated finish. Your plan may take until '+dateText(t.finishMax)+'.');
      const tOut=this.root.querySelector('[data-output="timeline"]');if(tOut){patch(tOut,this.timelineOutput(e));this.queueTimelineFocus();}
    }
    timelineOutput(e){
      const t=C.completionTimeline(records,e,today(),state.delay);
      const stages=[{key:'assessment',label:e.assessmentLine?.label||'Signature Assessment ✦',startMin:t.start,startMax:t.start,endMax:t.start,appointment:true,costKeys:['assessment'],description:'Smile Design, examination and your treatment plan.'},{key:'prepare',label:'Prepare for treatment',startMin:t.start,endMax:C.iso(C.addDays(C.parseDate(t.start),14)),costKeys:[],description:'Plan your appointments. Arrange finance if needed · allow 14 days for cooling-off.'},...t.stages];
      let html='<div class="tdbc-date-result text-size-small"><span>Start with your assessment</span><strong data-output="assessment-date">'+esc(dateText(t.start))+'</strong><p class="tdbc-help text-size-tiny">A two-week planning allowance before your first treatment appointment.</p></div><ol class="tdbc-timeline text-size-small">';
      for(const stage of stages){
        const on=this.stageOpen.has(stage.key),lines=e.lines.filter(l=>stage.costKeys.includes(l.key)),panelId=this.id+'-stage-'+stage.key;
        const detail='<div id="'+panelId+'" class="tdbc-stage-detail"><p>'+esc(stage.description)+'</p>'+lines.map(l=>'<div class="tdbc-stage-cost"><span>'+esc(l.label+lineQuantity(l))+(Number.isInteger(l.tier)&&l.record?.tierLabels?.[l.tier]?'<small class="text-size-tiny">'+esc(l.record.tierLabels[l.tier])+'</small>':'')+'</span><strong>'+(l.included?'Included':l.min===null?'To confirm':esc(range(l.min,l.max)))+'</strong></div>').join('')+(stage.sharedFee?'<p class="tdbc-help text-size-tiny">Your total treatment fee, counted once in the estimate; preparation and fitting are included.</p>':!lines.length?'<p class="tdbc-help text-size-tiny">Planning allowance · no additional treatment fee.</p>':'')+'</div>';
        html+='<li class="tdbc-timeline-row '+(stage.key===this.activeStage?'is-current':'')+'" data-stage="'+stage.key+'" data-node="stage-'+stage.key+'"><span class="tdbc-dot"></span><div class="tdbc-stage"><button type="button" class="tdbc-stage-toggle" data-action="stage" data-key="'+stage.key+'" aria-expanded="'+on+'" aria-controls="'+panelId+'"><span><small class="text-size-tiny">'+esc(dateRange(stage.startMin,stage.appointment?stage.startMax:stage.endMax))+'</small><strong>'+esc(stage.label)+'</strong></span>'+chevron+'</button>'+expand('stage-'+stage.key,on,detail)+'</div></li>';
      }
      return html+'</ol>'+t.plan.notes.map(n=>'<p class="tdbc-help text-size-tiny">'+esc(n)+'</p>').join('');
    }
    optionValue(key,select=false){
      if(select&&!state.selected[key]){state.selected[key]={...this.optionValue(key)};this.optionClosed.delete(key);this.optionPreview.delete(key);state.start='';state.delay=0;this.dismissTimingWarning();}
      return state.selected[key]||(this.optionDrafts[key]||={qty:1,tier:null});
    }
    change(event){
      const el=event.target;if(!this.ready)return;
      if(el.dataset.category){const k=el.dataset.category;if(el.checked)state.categories=[...new Set([...state.categories,k])];else{state.categories=state.categories.filter(c=>c!==k);C.OPTIONS.filter(o=>o.category===k).forEach(o=>delete state.selected[o.key]);}state.start='';state.delay=0;this.dismissTimingWarning();if(!state.categories.length){state.assessment='none';state.finance=false;state.hygiene=false;}}
      else if(el.dataset.select){this.optionClosed.delete(el.dataset.select);if(el.checked)state.selected[el.dataset.select]={...this.optionValue(el.dataset.select)};else{this.optionDrafts[el.dataset.select]={...state.selected[el.dataset.select]};delete state.selected[el.dataset.select];}state.start='';state.delay=0;this.dismissTimingWarning();}
      else if(el.hasAttribute('data-finance')){state.finance=el.checked;if(state.finance)state.term=12;}
      else if(el.dataset.qty){const o=C.OPTIONS.find(o=>o.key===el.dataset.qty);const limit=o?.record==='fillings'||o?.key==='fillings'?160:32;this.optionValue(el.dataset.qty,true).qty=Math.max(1,Math.min(limit,Math.floor(Number(el.value)||1)));}
      else if(el.dataset.tier){this.optionValue(el.dataset.tier,true).tier=el.value===''?null:Number(el.value);if(state.selected[el.dataset.tier]){state.delay=0;this.dismissTimingWarning();}}
      else if(el.dataset.arch){const v=this.optionValue('veneers',true);const arches=v.arches||['upper'];v.arches=el.checked?[...new Set([...arches,el.dataset.arch])]:arches.filter(a=>a!==el.dataset.arch);if(state.selected.veneers){state.delay=0;this.dismissTimingWarning();}}
      else if(el.dataset.assessment)state.assessment=el.checked?el.dataset.assessment:'none';
      else if(el.hasAttribute('data-hygiene')){state.hygiene=el.checked;state.start='';state.delay=0;this.dismissTimingWarning();}
      else if(el.hasAttribute('data-deposit-number'))state.deposit=Math.max(0,Math.round((Number(el.value)||0)*100));
      else if(el.dataset.date==='target'){const t=C.completionTimeline(records,C.estimate(records,state,this.config),today(),state.delay,el.value);state.delay=t.offset;if(t.tooSoon)this.showTimingWarning();else this.dismissTimingWarning();}
      else if(el.dataset.range){save();renderAll(this);return;}
      else return;
      state=C.normaliseState(state);renderAll();
    }
    input(event){const el=event.target,k=el.dataset.range;if(!this.ready||!k)return;
      if(k==='completion'){state.delay=Math.max(0,Math.min(730,Number(el.value)||0));if(state.delay>0)this.dismissTimingWarning();}
      else{state[k]=Number(el.value);el.setAttribute('aria-valuetext',k==='term'?state.term+' months':currency(state.deposit));if(k==='deposit'){const n=this.root.querySelector('[data-deposit-number]');if(n)n.value=state.deposit/100;}}
      this.outputs();save();
    }
    click(event){const el=event.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;
      if(action==='info'){const info=el.closest('.tdbc-info'),open=!info.classList.contains('is-open');closeTooltips();info.classList.toggle('is-open',open);el.setAttribute('aria-expanded',String(open));const panel=info.querySelector('[role=tooltip]');panel.setAttribute('aria-hidden',String(!open));panel.inert=!open;return;}
      if(action==='estimate'){const summary=this.root.querySelector('.tdbc-summary');if(summary){focusView(this);summary.focus({preventScroll:true});if(this.mode==='inline'&&window.lenis?.scrollTo)window.lenis.scrollTo(summary,{offset:-(parseFloat(getComputedStyle(document.documentElement).fontSize)*7)});else summary.scrollIntoView?.({behavior:'smooth',block:'start'});}return;}
      if(action==='close'){close();return;}
      if(action==='sooner'){this.setTimingWarning(!this.timingWarning);return;}
      if(action==='bridal'){
        this.bridalOpen=!this.bridalOpen;
        el.setAttribute('aria-expanded',String(this.bridalOpen));
        const panel=this.root.querySelector('[data-panel=bridal]');
        if(panel){panel.classList.toggle('is-expanded',this.bridalOpen);panel.setAttribute('aria-hidden',String(!this.bridalOpen));panel.inert=!this.bridalOpen;}
        this.queueTimelineFocus();return;
      }
      if(action==='retry'){this.init();return;}
      if(action==='vip'){event.preventDefault();for(const v of views)v.suspended=true;releaseFocus();goVIP(el);return;}
      if(!this.ready)return;
      if(action==='reset'){state=C.newState();this.context=null;this.breakdown=true;this.stageOpen.clear();this.optionClosed.clear();this.optionPreview.clear();this.optionDrafts={};this.activeStage='assessment';this.timelineManual=false;this.bridalOpen=false;this.dismissTimingWarning();try{sessionStorage.removeItem(STORAGE);}catch(_){}renderAll();this.scrollToStart();return;}
      else if(action==='start-assessment'){const categories=state.categories;state=C.newState();state.categories=categories;state.assessment='signature';this.stageOpen.clear();this.optionClosed.clear();this.optionPreview.clear();this.optionDrafts={};this.activeStage='assessment';this.timelineManual=false;this.bridalOpen=false;this.dismissTimingWarning();renderAll();const section=this.root.querySelector('[data-node=assessment]');section?.scrollIntoView?.({behavior:'smooth',block:'start'});return;}
      else if(action==='stage'){this.activeStage=el.dataset.key;this.timelineManual=true;this.stageOpen.has(el.dataset.key)?this.stageOpen.delete(el.dataset.key):this.stageOpen.add(el.dataset.key);this.outputs();return;}
      else if(action==='option'){
        const key=el.dataset.key,on=!!state.selected[key];
        const open=on?this.optionClosed.has(key):!this.optionPreview.has(key);
        if(on){open?this.optionClosed.delete(key):this.optionClosed.add(key);}
        else{open?this.optionPreview.add(key):this.optionPreview.delete(key);}
        el.setAttribute('aria-expanded',String(open));
        const panel=this.root.querySelector('[data-panel="option-'+key+'"]');
        if(panel){panel.classList.toggle('is-expanded',open);panel.setAttribute('aria-hidden',String(!open));panel.inert=!open;}
        this.queueTimelineFocus();return;
      }
      else if(action==='breakdown')this.breakdown=!this.breakdown;
      else if(action==='plus'||action==='minus'){const o=C.OPTIONS.find(o=>o.key===el.dataset.key),v=this.optionValue(el.dataset.key,true);if(v)v.qty=Math.max(1,Math.min(o?.record==='fillings'||o?.key==='fillings'?160:32,v.qty+(action==='plus'?1:-1)));}
      else if(action==='keep')this.context=null;
      else if(action==='context'){const config=this.context;state=C.newState();if(config)contextual(this,config);}
      else return;
      renderAll();
    }
  }
  function makeDialog(){if(dialog)return;
    dialog=document.createElement('dialog');dialog.className='tdbc-dialog';dialog.setAttribute('aria-labelledby','tdbc-dialog-title');dialog.setAttribute('data-lenis-prevent','');
    dialog.innerHTML='<div class="tdbc-drawer-bar"><span>THE DENTAL BARNS</span><button type="button" data-tdb-calc-close aria-label="Close calculator">Close <span aria-hidden="true">×</span></button></div><div class="tdbc-drawer-root"><div class="tdbc-shell"><h2 id="tdbc-dialog-title">Explore your treatment costs</h2><p>Loading current prices…</p></div></div>';
    document.body.append(dialog);drawerView=new View(dialog.querySelector('.tdbc-drawer-root'),{cosmetic:true,restorative:true,finance:true},'drawer');
    dialog.querySelector('[data-tdb-calc-close]').addEventListener('click',()=>close());
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close();}});
    dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const f=[...dialog.querySelectorAll('button,a[href],input,select,summary,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
  }
  async function open(trigger){
    if(typeof HTMLDialogElement==='undefined'){location.assign(PRICE_PATH+'#treatment-calculator');return;}
    makeDialog();lastTrigger=trigger;drawerView.suspended=false;focusView(drawerView);const config=configFrom(trigger);
    try{window.TDBVIPDrawer?.reset?.();}catch(_){}
    if(!dialog.open){oldOverflow=document.documentElement.style.overflow;oldPadding=document.documentElement.style.paddingRight;const gap=innerWidth-document.documentElement.clientWidth;document.documentElement.style.overflow='hidden';if(gap>0)document.documentElement.style.paddingRight=gap+'px';scrollWasStopped=!!window.lenis?.isStopped;try{window.lenis?.stop?.();}catch(_){}dialog.showModal();}
    dialog.scrollTop=0;dialog.querySelector('[data-tdb-calc-close]').focus({preventScroll:true});
    if(!drawerView.ready){drawerView.config=config;await drawerView.init();}else{contextual(drawerView,config);drawerView.render();save();}
  }
  function close(restore=true){if(!dialog?.open)return;releaseFocus();dialog.close();document.documentElement.style.overflow=oldOverflow;document.documentElement.style.paddingRight=oldPadding;try{if(!scrollWasStopped)window.lenis?.start?.();}catch(_){}if(restore&&lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});renderAll(drawerView);syncViewportFocus();}
  function goVIP(invoker){save();close(false);try{
      if(window.TDBVIPDrawer?.open){window.TDBVIPDrawer.open();return;}
      if(window.TDBVIPDrawerLoader?.open){window.TDBVIPDrawerLoader.open();return;}
    }catch(_){}
    // Existing native VIP route is the safe fallback. No new submission fields are invented.
    const link=[...document.querySelectorAll('a[href="#VIP"],a[href="#vip"]')].find(a=>!a.closest('.tdb-calc'));
    if(link)link.click();else location.assign('/vip');
  }
  function start(){
    document.querySelectorAll('[data-tdb-calculator="inline"]').forEach(root=>{if(root.hasAttribute('data-tdb-calc-ready'))return;root.setAttribute('data-tdb-calc-ready','true');
      new View(root,configFrom(root),'inline').init();});
    // Dismissing a tooltip consumes the whole first tap, before page/menu handlers.
    // A new pointer gesture clears the guard even if the previous one was a drag.
    let dismissTap=false;
    const outsideTooltip=target=>document.querySelector('.tdbc-info.is-open')&&!target.closest?.('.tdbc-info.is-open');
    const consume=event=>{event.preventDefault();event.stopImmediatePropagation();};
    const dismissTooltipTap=event=>{
      const root=document.querySelector('.tdbc-info.is-open')?.closest('.tdb-calc');
      const owner=views.find(view=>view.root===root);
      closeTooltips();consume(event);
      if(owner?.mode==='inline'){
        const b=owner.root.getBoundingClientRect();
        owner.visible=b.height>0&&b.top<innerHeight&&b.bottom>0;
      }
      // Other page controllers can release shared focus on an outside tap.
      // Reassert the visible calculator's hold rather than treating dismissal as exit.
      if(owner&&(owner.visible||owner.mode==='drawer'&&dialog?.open))focusView(owner,true);
      else syncViewportFocus();
    };
    window.addEventListener('pointerdown',event=>{
      dismissTap=!!outsideTooltip(event.target);
      if(dismissTap){dismissTooltipTap(event);return;}
      syncViewportFocus();
    },{capture:true,passive:false});
    window.addEventListener('pointerup',event=>{if(dismissTap)consume(event);},{capture:true,passive:false});
    window.addEventListener('pointercancel',()=>{dismissTap=false;},true);
    window.addEventListener('click',event=>{
      if(dismissTap||outsideTooltip(event.target)){dismissTap=false;dismissTooltipTap(event);}
    },true);
    window.addEventListener('keydown',()=>{dismissTap=false;},true);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(document.querySelector('.tdbc-info.is-open')||views.some(v=>v.timingWarning))){closeTooltips();for(const v of views)v.dismissTimingWarning();event.preventDefault();event.stopImmediatePropagation();}},true);
    document.addEventListener('click',event=>{const a=event.target.closest(SELECTOR);if(!a||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;event.preventDefault();open(a);});
  }
  window.TDBCalculator=Object.freeze({version:C.VERSION,open,close,refresh:()=>{records=null;for(const v of views)v.init();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
