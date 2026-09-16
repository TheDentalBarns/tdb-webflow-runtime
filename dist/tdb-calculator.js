/* TDB Treatment Calculator v1.0.0 — deterministic pricing and planning rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TDBCalculatorCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const VERSION = '1.1.0';
  const IDS = Object.freeze({
    assessment: '6aa293f6253d574a41978d9e', design: '68386f15264c9bdb140b5f2e',
    whitening: '681ce51276b22da0b0660090', aligners: '67a227e75f8c501023eb066b',
    bonding: '681ce7a6838a937aa274f5e6', veneers: '681dfc7415fdf2571f077b0f',
    gumline: '68386aca9ee514c02cdda9ee', fillings: '68d6b282da240abf72520b6a',
    rct: '6a61ce5648ee7f280db22a34', crowns: '68d7ca91db5f05043ba12fa1',
    onlays: '68d7cfac090cb5cda1b931d9', extractions: '68d6affec0a324b379f2c5b5',
    hygiene: '681dfde1b4412464104bca59'
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
    const match=text.match(/^(from\s+)?£\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?:\s+per\s+(tooth|surface|lesion))?$/i);
    if (!match) return null;
    const pennies=Math.round(Number(match[2].replace(/,/g,''))*100);
    if (!Number.isSafeInteger(pennies)||pennies<=0) return null;
    return {min:pennies,from:!!match[1],unit:(match[3]||'').toLowerCase()};
  }
  function recordFromFields(f) {
    const price=parsePrice(f.price), tiers=[1,2,3,4,5].map(n=>f['tier'+n]).filter(v=>String(v||'').trim());
    const parsed=tiers.map(parsePrice);
    const valid=!!price && parsed.every(Boolean) && (!parsed.length || parsed[0].min===price.min);
    const vals=valid ? parsed.map(p=>p.min) : [];
    const timing=finite(f.min)&&finite(f.max)&&Number(f.min)>=0&&Number(f.max)>=Number(f.min)&&['weeks','months'].includes(f.unit)&&Number(f.max)<=(f.unit==='months'?120:520);
    return {
      id:f.record, name:String(f.name||'').trim(), label:String(f.label||f.name||'').trim(),
      tooltip:String(f.tooltip||'').trim(), rawPrice:String(f.price||''),
      valid, min:valid?price.min:null,max:valid?Math.max(price.min,...vals):null,
      from:!!price?.from,unit:price?.unit||'',tiers:vals,
      tierLabels:[1,2,3].map(n=>String(f['tier'+n+'friendly']||'').trim()),
      timing:timing?{min:Number(f.min),max:Number(f.max),unit:f.unit}:null,
      includesWhitening:f.whitening===true||f.whitening==='true',
      includesHygiene:f.hygiene===true||f.hygiene==='true',
      bookingDeposit:finite(f.deposit)?Math.round(Number(f.deposit)*100):null
    };
  }
  function newState() {
    return {categories:[],selected:{},assessment:'none',hygiene:false,finance:false,deposit:0,term:12,target:'',start:''};
  }
  function normaliseState(raw) {
    const s=newState();
    if(!raw||typeof raw!=='object')return s;
    s.categories=['cosmetic','restorative'].filter(k=>Array.isArray(raw.categories)&&raw.categories.includes(k));
    for(const o of OPTIONS){
      const v=raw.selected&&own(raw.selected,o.key)?raw.selected[o.key]:null;
      if(v&&s.categories.includes(o.category)){
        s.selected[o.key]={qty:o.quantity?clamp(Math.floor(Number(v.qty)||1),1,o.record==='fillings'||o.key==='fillings'?160:32):1,tier:o.key==='replacement'?2:['aligners','bonding'].includes(o.key)&&Number.isInteger(v.tier)&&v.tier>=0&&v.tier<=2?v.tier:null};
      }
    }
    s.assessment=['none','design','signature'].includes(raw.assessment)?raw.assessment:'none';
    s.hygiene=raw.hygiene===true;s.finance=raw.finance===true;
    s.deposit=finite(raw.deposit)?clamp(Math.round(Number(raw.deposit)),0,100000000):0;
    s.term=clamp(Math.round(Number(raw.term)||12),3,12);
    s.target=parseDate(raw.target)?raw.target:'';s.start=parseDate(raw.start)?raw.start:'';
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
      const l={key,recordKey,record:r,label:label||r?.label||recordKey,qty:quantity,included};
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
    const order=['assessment','hygiene','extractions','replacement','fillings','rct','crowns','onlays','aligners','whitening','whitening-included','gumline','bonding','veneers'];
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
    const stages=[],unknown=[],has=k=>e.selected.some(o=>o.key===k);
    function push(key,label){
      const r=records[IDS[key]],t=r?.timing;
      stages.push({key,label:label||r?.label||key,timing:t});if(!t)unknown.push(label||r?.label||key);
    }
    if(!e.required)return {stages,unknown,notes:[]};
    const notes=['Illustrative sequence, subject to assessment and appointment availability. More teeth or complex care may need additional visits.'];
    if(has('extractions'))push('extractions');
    if(has('fillings')||has('replacement'))push('fillings',has('replacement')&&has('fillings')?'Fillings & metal filling replacement':has('replacement')?'Metal filling replacement':undefined);
    if(has('rct'))push('rct');
    const shadeWork=has('whitening')||has('aligners');
    // Crowns/onlays may be needed for stability, or delayed for final shade matching.
    // Without tooth-level clinical decisions, withhold a precise completion date.
    for(const k of ['crowns','onlays'])if(has(k)){
      push(k);if(shadeWork)unknown.push('Timing of '+(records[IDS[k]]?.label||k)+' around whitening/aligners');
    }
    if(e.cosmetic)notes.push(e.hygieneIncluded?'Hygiene is included with aligners. Its appointment is arranged as part of preparation.':'Healthy gums come first. Any hygiene or periodontal care needed may affect timing.');
    if(e.state.hygiene&&!e.hygieneIncluded)unknown.push('Hygiene preparation');
    if(has('aligners'))push('aligners');
    if(has('whitening')||e.whitenIncluded)push('whitening','Whitening & colour settling');
    if(has('gumline'))push('gumline');
    if(has('bonding'))push('bonding');
    if(has('veneers'))push('veneers');
    if(has('bonding')&&has('veneers'))notes.push('Bonding and veneers are shown in separate stages. Your dentist may combine appointments where appropriate.');
    return {stages,unknown:[...new Set(unknown)],notes};
  }
  function schedule(plan,start){
    if(!parseDate(start))throw new RangeError('Invalid assessment date');
    const initial=parseDate(start);let low=addDays(initial,14),high=addDays(initial,14);
    let reliable=plan.unknown.length===0;
    const stages=plan.stages.map(s=>{
      const fromMin=low,fromMax=high;
      if(s.timing){low=stageDate(low,s.timing,'min');high=stageDate(high,s.timing,'max');}else reliable=false;
      return {...s,startMin:iso(fromMin),startMax:iso(fromMax),endMin:iso(low),endMax:iso(high)};
    });
    return {start,stages,finishMin:reliable?iso(low):null,finishMax:reliable?iso(high):null,reliable};
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
    if(!e.required)return 'Choose treatments';
    const s=schedule(plan(records,e),today);
    if(!s.reliable)return 'Timing at assessment';
    const days=d=>Math.round((parseDate(d)-parseDate(today))/86400000);
    const months=days(s.finishMax)>=90,divisor=months?30.4375:7;
    const min=Math.ceil(days(s.finishMin)/divisor),max=Math.ceil(days(s.finishMax)/divisor);
    return (min===max?min:min+'–'+max)+' '+(months?'months':'weeks');
  }
  return Object.freeze({VERSION,IDS,OPTIONS,parsePrice,recordFromFields,newState,normaliseState,allowedOptions,estimate,payment,finance,parseDate,iso,addDays,addMonths,plan,schedule,suggestedStart,timeline,duration});
});

/* TDB Treatment Calculator v1.1.0 — shared inline/drawer controller. */
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
      const f={record:id};for(const key of ['name','label','price','tooltip','min','max','unit','deposit','tier1','tier2','tier3','tier4','tier5','tier1friendly','tier2friendly','tier3friendly'])f[key]=el.getAttribute('data-'+key)||'';
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

  const infoIcon='<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path fill="currentColor" d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m8-48a8 8 0 0 1-16 0v-48a8 8 0 0 1 16 0Zm-8-72a12 12 0 1 1 12-12a12 12 0 0 1-12 12Z"/></svg>';
  const arrow='<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="m18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"/></svg>';
  const chevron='<span class="tdbc-chevron" aria-hidden="true"><svg viewBox="0 0 32 32" focusable="false"><path fill="currentColor" d="M16.5303 20.8839C16.2374 21.1768 15.7626 21.1768 15.4697 20.8839L7.82318 13.2374C7.53029 12.9445 7.53029 12.4697 7.82318 12.1768L8.17674 11.8232C8.46963 11.5303 8.9445 11.5303 9.2374 11.8232L16 18.5858L22.7626 11.8232C23.0555 11.5303 23.5303 11.5303 23.8232 11.8232L24.1768 12.1768C24.4697 12.4697 24.4697 12.9445 24.1768 13.2374L16.5303 20.8839Z"/></svg></span>';
  const check=on=>'<span aria-hidden="true" class="w-checkbox-input w-checkbox-input--inputType-custom form_checkbox-icon '+(on?'w--redirected-checked':'')+'"></span>';
  const step=(n,label)=>'<h3 class="tdbc-step-heading heading-style-h4"><span class="tdbc-number text-size-tiny">'+n+'</span><span>'+label+'</span></h3>';
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
  let focusedView=null,focusMove=false,focusEpoch=0;
  function releaseFocus(){if(!focusedView)return;focusedView.root.classList.remove('is-focused');document.documentElement.classList.remove('tdbc-chrome-away');focusedView=null;window.TDBNavScroll?.release();}
  function focusView(view){
    const epoch=++focusEpoch;
    if(focusedView&&focusedView!==view)focusedView.root.classList.remove('is-focused');focusedView=view;
    view.root.classList.add('is-focused');document.documentElement.classList.add('tdbc-chrome-away');
    const nav=document.querySelector('.navbar10_component');
    if(nav){const b=nav.getBoundingClientRect(),parts=[nav,...nav.querySelectorAll('.w-nav-overlay,.navbar10_menu[data-nav-menu-open],.navbar10_dropdown-list.w--open')];nav.style.setProperty('--tdb-slider-nav-away',Math.max(nav.offsetHeight,...parts.filter(p=>p.getClientRects().length).map(p=>p.getBoundingClientRect().bottom-b.top))+'px');}
    window.TDBNavScroll?.focus(()=>{requestAnimationFrame(()=>requestAnimationFrame(()=>{if(epoch===focusEpoch)releaseFocus();}));},()=>focusMove||view.mode==='drawer');
  }
  function closeTooltips(except){document.querySelectorAll('.tdbc-info.is-open').forEach(info=>{if(info===except)return;info.classList.remove('is-open');info.querySelector('button').setAttribute('aria-expanded','false');const p=info.querySelector('[role="tooltip"]');p.setAttribute('aria-hidden','true');p.inert=true;});}

  class View {
    constructor(root,config,mode){this.root=root;this.config=config;this.mode=mode;this.id='tdbc-'+(++sequence);this.context=null;this.ready=false;this.breakdown=true;
      root.classList.add('tdb-calc');root.addEventListener('change',e=>this.change(e));root.addEventListener('input',e=>this.input(e));root.addEventListener('click',e=>this.click(e));
      root.addEventListener('pointerdown',()=>focusView(this),{passive:true});root.addEventListener('focusin',()=>focusView(this));views.push(this);}
    async init(){this.root.setAttribute('aria-busy','true');try{await getRecords();this.ready=true;contextual(this,this.config);this.render();renderAll(this);}catch(_){this.root.innerHTML='<div class="tdbc-shell"><h2 class="heading-style-h3">Explore your treatment costs</h2><p>We couldn’t load the current prices. Please try again or view our fee guide.</p><button type="button" class="button is-secondary" data-action="retry">Try again</button> <a href="'+PRICE_PATH+'">View fees</a></div>';}finally{this.root.removeAttribute('aria-busy');}}
    render(){
      if(!this.ready)return;
      const e=C.estimate(records,state,this.config),id=this.id;
      if(e.hiddenSelections.length&&!this.context){this.context={...this.config};this.config.cosmetic=this.config.restorative=true;return this.render();}
      const active=state.categories.length>0,selected=e.selected.length,hasEstimate=active&&e.lines.length>0,available=C.allowedOptions(this.config);
      const form='<section class="tdbc-step" data-node="step-1" aria-labelledby="'+id+'-explore"><div id="'+id+'-explore">'+step('01','What would you like to explore?')+'</div><p class="tdbc-help text-size-small">Choose one or both.</p><div class="tdbc-categories">'+
      ['cosmetic','restorative'].filter(k=>this.config[k]).map(k=>'<label class="tdbc-category form_checkbox '+(state.categories.includes(k)?'is-selected':'')+'"><input type="checkbox" data-control="category-'+k+'" data-category="'+k+'" '+(state.categories.includes(k)?'checked':'')+'>'+check(state.categories.includes(k))+'<span><span class="text-style-tagline-restored">'+(k==='cosmetic'?'Cosmetic':'Restorative')+'</span><small class="text-size-tiny">'+(k==='cosmetic'?'Improve my smile':'Restore my teeth')+'</small></span></label>').join('')+'</div></section>'+
      expand('treatments',active,'<section class="tdbc-step" data-node="step-2">'+step('02','Shape your estimate')+'<p class="tdbc-help text-size-small">Explore freely. Your dentist will help confirm the right treatments.</p>'+['cosmetic','restorative'].filter(k=>state.categories.includes(k)&&this.config[k]).map(k=>'<section class="tdbc-treatment-group" data-node="group-'+k+'" aria-label="'+k+' treatments"><h4 class="text-style-tagline-restored tdbc-dd-fade">'+(k==='cosmetic'?'Cosmetic treatments':'Restorative treatments')+'</h4>'+available.filter(o=>o.category===k).map(o=>this.option(o,e)).join('')+'</section>').join('')+(!hasEstimate?'<button type="button" class="tdbc-text-button text-size-small" data-action="start-assessment">Prefer to start with an assessment?</button>':'')+'</section>')+
      expand('journey',hasEstimate,hasEstimate?(selected?this.timelineControls(e):'')+this.assessment(e)+(e.cosmetic?this.hygiene(e):'')+this.summary(e):'')+
      (active?'<footer class="tdbc-footnote text-size-tiny" data-node="footnote">A guide to possibilities, subject to assessment and your confirmed treatment plan. Your selections stay in this tab for up to four hours. <button type="button" class="tdbc-text-button" data-action="reset" data-control="reset">Reset estimate</button></footer>':'');
      patch(this.root,'<div class="tdbc-shell" data-node="shell"><header class="tdbc-header" data-node="header"><p class="text-style-tagline-restored">YOUR SMILE, YOUR POSSIBILITIES</p><h2 class="heading-style-h3"'+(this.mode==='drawer'?' id="tdbc-dialog-title"':'')+'>Explore your treatment costs</h2><p class="text-size-small">Start with what matters to you. We’ll bring together a guide to your investment and timing.</p></header>'+
      (this.context?'<div class="tdbc-notice text-size-small" data-node="context"><p>Your existing estimate is saved. Continue with it, or start with the options from this page.</p><div class="tdbc-actions"><button type="button" data-action="keep" class="tdbc-text-button">Keep my estimate</button><button type="button" data-action="context" class="tdbc-text-button">Start with these options</button></div></div>':'')+
      (hasEstimate?'<button type="button" class="tdbc-live" data-node="live" data-action="estimate" aria-label="View your full estimate"><span class="tdbc-live-copy"><span class="text-size-tiny">Your estimate</span><strong class="text-size-small" data-output="live">'+esc(priceText(e))+'</strong></span><span class="tdbc-live-copy"><span class="text-size-tiny">Estimated duration</span><span class="text-size-small" data-output="duration">'+esc(C.duration(records,e,today()))+'</span></span>'+chevron+'</button>':'')+'<div class="tdbc-main" data-node="main">'+form+'</div></div>');
      this.outputs();
    }
    option(o,e){
      const r=records[C.IDS[o.record||o.key]],v=state.selected[o.key],on=!!v,included=o.key==='whitening'&&e.whitenIncluded,label=name(o),rid=this.id+'-'+o.key,unit=r?.unit||(o.quantity?'tooth':'');
      const complexity=['aligners','bonding'].includes(o.key)&&r?.tierLabels?.some(Boolean),hasControls=o.quantity||complexity;
      const quoted=o.key==='replacement'&&r?.valid&&r.tiers[2]?currency(r.tiers[2])+(unit?' / '+unit:''):recordPrice(r);
      const row='<div class="tdbc-option-row"><label class="tdbc-option-label form_checkbox" for="'+rid+'"><input id="'+rid+'" type="checkbox" data-control="select-'+o.key+'" data-select="'+o.key+'" '+(on||included?'checked ':'')+(included?'disabled ':'')+(hasControls?'aria-expanded="'+on+'" aria-controls="'+rid+'-controls"':'')+'>'+check(on||included)+'<span><span class="text-size-small">'+esc(label)+'</span><small class="text-size-tiny">'+(included?'Included with your aligners':esc(quoted))+'</small></span>'+(hasControls?chevron:'')+'</label><div class="tdbc-info" data-node="info-'+o.key+'"><button type="button" class="tdbc-info-button" data-action="info" aria-label="About '+esc(label)+'" aria-expanded="false" aria-controls="'+rid+'-tip">'+infoIcon+'</button><div class="tdbc-info-panel text-size-small" role="tooltip" id="'+rid+'-tip" aria-hidden="true" inert>'+esc(r?.tooltip||'Your dentist will confirm suitability, fees and the treatment sequence at your assessment.')+(o.key==='replacement'?' Count the surfaces to be replaced separately from any new fillings.':'')+'</div></div></div>';
      const controls=!hasControls?'':expand('option-'+o.key,on&&!included,'<div class="tdbc-option-controls" id="'+rid+'-controls">'+(o.quantity?'<label class="text-size-small" for="'+rid+'-qty">'+(unit==='surface'?'Surfaces to restore':'Number of teeth')+'</label><div class="tdbc-quantity"><button type="button" data-action="minus" data-key="'+o.key+'" aria-label="Fewer '+esc(label)+'" '+((v?.qty||1)<=1?'disabled':'')+'>−</button><input id="'+rid+'-qty" data-control="qty-'+o.key+'" data-qty="'+o.key+'" type="number" inputmode="numeric" min="1" max="'+(unit==='surface'?160:32)+'" step="1" value="'+(v?.qty||1)+'"><button type="button" data-action="plus" data-key="'+o.key+'" aria-label="More '+esc(label)+'">+</button></div>'+(unit==='surface'?'<p class="tdbc-help text-size-tiny">One tooth may need several surfaces restored. If unsure, use one surface for a starting guide.</p>':''):'')+
      (complexity?'<fieldset class="tdbc-complexity"><legend class="text-size-small">'+(o.key==='aligners'?'What would you like to improve?':'What changes do you have in mind?')+'</legend>'+r.tierLabels.map((label,i)=>label&&r.tiers[i]?'<label class="tdbc-choice form_checkbox text-size-small"><input type="radio" name="'+rid+'-complexity" data-control="tier-'+o.key+'-'+i+'" data-tier="'+o.key+'" value="'+i+'" '+(v?.tier===i?'checked':'')+'>'+check(v?.tier===i)+'<span>'+esc(label)+'</span></label>':'').join('')+'<p class="tdbc-help text-size-tiny">Choose the closest description, or leave these blank for a guide range. Your dentist will confirm what’s right for you.</p>'+(v?.tier!==null&&v?.tier!==undefined?'<button type="button" class="tdbc-text-button text-size-tiny" data-action="clear-tier" data-key="'+o.key+'">Show a guide range</button>':'')+'</fieldset>':'')+'</div>');
      return '<div class="tdbc-option '+(on||included?'is-selected':'')+'" data-node="option-'+o.key+'">'+row+controls+'</div>';
    }
    assessment(e){const a=records[C.IDS.assessment],d=records[C.IDS.design];return '<section class="tdbc-step tdbc-assessment" data-node="assessment"><p class="text-style-tagline-restored">Every journey starts here</p>'+step(e.required?'04':'03',esc(a?.label||'Signature Assessment'))+'<p class="text-size-small">Smile Design and a comprehensive examination, together with Dr Keely.</p><ul class="tdbc-included text-size-small">'+['Smile Design','Comprehensive examination & appropriate diagnostics','Itemised plan, costs & written report'].map(t=>'<li><span class="tdbc-included-mark" aria-hidden="true"></span><span>'+t+'</span></li>').join('')+'</ul><div class="tdbc-assessment-price"><strong class="heading-style-h4">'+esc(recordPrice(a))+'</strong><span class="text-size-tiny">'+esc(a?.bookingDeposit!==null&&a?.bookingDeposit!==undefined?currency(a.bookingDeposit)+' booking deposit, included in the total':'Booking details confirmed with your appointment')+'</span></div>'+(e.required?'<p class="tdbc-help text-size-tiny">Included once in your estimate. Smile Design and your examination are bundled together.</p>':'<label class="tdbc-manual form_checkbox text-size-small"><input type="checkbox" data-control="assessment" data-assessment="signature" '+(state.assessment==='signature'?'checked':'')+'>'+check(state.assessment==='signature')+'<span>Include Signature Assessment</span></label>'+(d?.valid?'<label class="tdbc-manual form_checkbox text-size-small"><input type="checkbox" data-control="design" data-assessment="design" '+(state.assessment==='design'?'checked':'')+'>'+check(state.assessment==='design')+'<span>Explore Smile Design only · '+esc(recordPrice(d))+'</span></label>':''))+'</section>';}
    hygiene(e){const r=records[C.IDS.hygiene];return '<section class="tdbc-step" data-node="hygiene">'+step('05','Healthy foundations')+'<p class="text-size-small">We’ll review your gum health before cosmetic treatment.</p>'+(e.hygieneIncluded?'<p class="text-size-small">Airflow® hygiene is included with your aligner package.</p>':'<label class="tdbc-manual form_checkbox text-size-small"><input type="checkbox" data-control="hygiene" data-hygiene '+(state.hygiene?'checked':'')+'>'+check(state.hygiene)+'<span>Add a hygiene allowance · '+esc(recordPrice(r))+'</span></label><p class="tdbc-help text-size-tiny">Recommended where needed. Add this allowance to include it in your estimate.</p>')+'<p class="tdbc-help text-size-tiny">Any additional periodontal care will be discussed after assessment.</p></section>';}
    summary(e){return '<section class="tdbc-summary" data-output="summary" id="'+this.id+'-estimate" data-node="estimate" tabindex="-1" aria-label="Your estimated investment"><p class="text-style-tagline-restored">Your estimated investment</p><div class="tdbc-total heading-style-h3" data-output="total">'+esc(priceText(e))+'</div><p class="tdbc-summary-duration text-size-small">'+clock+'<span>Estimated duration: <span data-output="duration-summary">'+esc(C.duration(records,e,today()))+'</span></span></p>'+(e.required?'<p class="tdbc-help text-size-tiny">Includes two weeks after your assessment for planning. Timing is confirmed with your treatment plan.</p>':'')+'<div class="tdbc-breakdown"><button type="button" class="tdbc-disclosure text-style-tagline-restored" data-action="breakdown" aria-expanded="'+this.breakdown+'" aria-controls="'+this.id+'-breakdown">Your breakdown'+chevron+'</button>'+expand('breakdown',this.breakdown,'<ul class="text-size-small" id="'+this.id+'-breakdown">'+e.lines.map(l=>'<li><span>'+esc(l.label)+(l.qty>1?' <small class="text-size-tiny">× '+l.qty+(l.record?.unit==='surface'?' surfaces':' teeth')+'</small>':'')+'</span><strong>'+(l.included?'Included':l.min===null?'To confirm':esc(range(l.min,l.max)))+'</strong></li>').join('')+'</ul>')+'</div>'+(!e.complete?'<p class="tdbc-notice text-size-small">Some prices need confirmation: '+esc(e.missing.join(', '))+'. The subtotal excludes these items.</p>':'')+(e.cosmetic&&!e.hygieneIncluded&&!state.hygiene?'<p class="tdbc-help text-size-tiny">Hygiene, if needed, is additional.</p>':'')+(this.config.finance?this.financeControls(e):'')+'<a class="button is-icon is-secondary is-alternate tdbc-vip w-inline-block" href="#VIP" data-action="vip"><span>Join VIP</span><span class="icon-embed-xxsmall is-up w-embed">'+arrow+'</span></a><p class="tdbc-help text-size-tiny">Discuss your options and take the next step with us.</p></section>';}
    financeControls(e){const f=C.finance(e,state.deposit,state.term);return '<div class="tdbc-finance" data-node="finance"><label class="tdbc-manual form_checkbox tdbc-finance-toggle text-size-small"><input type="checkbox" data-control="finance" data-finance '+(state.finance?'checked':'')+' aria-expanded="'+state.finance+'" aria-controls="'+this.id+'-finance">'+check(state.finance)+'<span>Finance available · explore 0%<small class="text-size-tiny">From £250, over 3–12 months</small></span>'+chevron+'</label>'+expand('finance',state.finance,'<div class="tdbc-finance-controls" id="'+this.id+'-finance">'+(f?'<label class="text-size-small" for="'+this.id+'-deposit">Upfront payment <output data-output="deposit">'+esc(currency(f.deposit))+'</output></label><input id="'+this.id+'-deposit" type="range" min="'+f.minimumDeposit+'" max="'+f.limit+'" step="100" value="'+f.deposit+'" data-control="deposit" data-range="deposit" aria-valuetext="'+esc(currency(f.deposit))+'"><div class="tdbc-range-labels text-size-tiny"><span>'+esc(currency(f.minimumDeposit))+' minimum</span><span>'+esc(currency(f.limit))+'</span></div><label class="tdbc-sr" for="'+this.id+'-deposit-value">Upfront payment in pounds</label><input id="'+this.id+'-deposit-value" class="form_input" type="number" min="'+f.minimumDeposit/100+'" max="'+f.limit/100+'" step="1" value="'+f.deposit/100+'" data-control="deposit-number" data-deposit-number><p class="tdbc-help text-size-tiny">Includes your '+esc(currency(f.assessment))+' Signature Assessment, counted once in the total.</p><label class="text-size-small" for="'+this.id+'-term">Repayment term <output data-output="term">'+state.term+' months</output></label><input id="'+this.id+'-term" type="range" min="3" max="12" step="1" value="'+state.term+'" data-control="term" data-range="term" aria-valuetext="'+state.term+' months"><div class="tdbc-range-labels text-size-tiny"><span>3 months</span><span>12 months</span></div><div data-output="finance"></div><p class="tdbc-help text-size-tiny">Illustration at 0% interest, subject to eligibility and lender approval. Your confirmed treatment plan sets the final amount.</p>':'<p class="text-size-small">Finance illustrations need complete pricing and at least £250 remaining after your assessment payment.</p>')+'</div>')+'</div>';}
    timelineControls(e){const t=C.timeline(records,e,state.target,today(),state.start);return '<section class="tdbc-step" data-node="timeline">'+step('03','A date to look forward to')+'<p class="tdbc-help text-size-small">An occasion in mind? Explore when your journey might begin.</p><label class="text-size-small" for="'+this.id+'-target">Target completion date <span class="tdbc-optional text-size-tiny">Optional</span></label><input class="form_input" id="'+this.id+'-target" type="date" data-control="target" data-date="target" value="'+esc(state.target)+'"><div data-output="timeline"></div>'+(t.reliable&&state.target&&t.suggestedEarliest?'<div class="tdbc-date-controls"><label class="text-size-small" for="'+this.id+'-start">Explore an assessment date</label><input class="form_input" id="'+this.id+'-start" type="date" data-control="start" data-date="start" value="'+t.start+'" min="'+today()+'"><label class="tdbc-sr" for="'+this.id+'-date-slider">Move the assessment earlier or later</label><input id="'+this.id+'-date-slider" type="range" data-control="date-slider" data-range="start" min="0" max="'+Math.max(1095,Math.ceil((C.parseDate(t.start)-C.parseDate(today()))/86400000)+365)+'" step="1" value="'+Math.round((C.parseDate(t.start)-C.parseDate(today()))/86400000)+'" aria-valuetext="'+esc(dateText(t.start))+'"><div class="tdbc-range-labels text-size-tiny"><span>Earlier</span><span>Later</span></div><p class="tdbc-help text-size-tiny">This explores timing; it does not book or check available appointments.</p></div>':'')+'</section>';}
    outputs(){
      const e=C.estimate(records,state,this.config),f=C.finance(e,state.deposit,state.term);
      if(f&&state.deposit!==f.deposit){state.deposit=f.deposit;save();}
      const set=(key,value)=>{const el=this.root.querySelector('[data-output="'+key+'"]');if(el&&el.textContent!==value)el.textContent=value;};
      set('live',priceText(e));set('total',priceText(e));set('duration',C.duration(records,e,today()));set('duration-summary',C.duration(records,e,today()));set('deposit',currency(f?.deposit||0));set('term',state.term+' months');
      const facts=this.root.querySelector('[data-output="finance"]');if(facts&&f)patch(facts,'<div class="tdbc-summary-monthly"><span class="text-size-tiny">0% over '+state.term+' months</span><strong class="heading-style-h4">'+esc(range(f.low.monthly,f.high.monthly))+'<small class="text-size-small"> / month</small></strong></div><dl class="tdbc-finance-facts text-size-small">'+[['Total estimate',range(e.min,e.max)],['Upfront, including assessment',currency(f.deposit)],['Amount financed',range(f.low.balance,f.high.balance)],['Final monthly payment',range(f.low.final,f.high.final)]].map(([a,b])=>'<div><dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd></div>').join('')+'</dl>');
      const tOut=this.root.querySelector('[data-output="timeline"]');if(tOut)patch(tOut,this.timelineOutput(e));
    }
    timelineOutput(e){
      const t=C.timeline(records,e,state.target,today(),state.start),dated=!!state.target&&t.reliable&&!!t.suggestedEarliest;
      let html='';
      if(t.plan.unknown.length)html+='<p class="tdbc-notice text-size-small">We can map your treatment stages, but need to assess '+esc(t.plan.unknown.join(', '))+' before suggesting a completion date.</p>';
      if(t.targetPast)html+='<p class="tdbc-warning text-size-small">Your target date has passed. Choose a future date to explore your options.</p>';
      else if(t.tight)html+='<p class="tdbc-notice text-size-small">Your target date may be tight. We’re used to helping patients plan around important occasions. At your assessment, we can explore what may be achievable, including a staged approach.</p>';
      if(dated){html+='<div class="tdbc-date-result"><span>To aim for '+esc(dateText(state.target))+'</span><strong>Assessment '+esc(dateRange(t.suggestedEarliest,t.suggestedLatest))+'</strong><p>'+(t.suggestedEarliest!==t.suggestedLatest?'The earlier date allows for the longer treatment estimate.':'Based on the illustrative sequence below.')+'</p></div><div class="tdbc-date-result is-current"><span>Your explored assessment: '+esc(dateText(t.start))+'</span><strong>Estimated finish '+esc(dateRange(t.finishMin,t.finishMax))+'</strong><p>'+(t.meetsTarget?'This guide fits within your target date.':'This guide may extend beyond your target date.')+'</p></div>';}
      html+='<ol class="tdbc-timeline text-size-small"><li><span class="tdbc-dot"></span><div><small class="text-size-tiny">'+(dated?esc(dateText(t.start)):'Week 1')+'</small><strong>Signature Assessment ✦</strong><p>Smile Design, examination and your treatment plan.</p></div></li><li><span class="tdbc-dot"></span><div><small class="text-size-tiny">'+(dated?esc(dateRange(t.start,C.iso(C.addDays(C.parseDate(t.start),14)))):'Two-week allowance after assessment')+'</small><strong>Prepare for treatment</strong><p>Plan your appointments and any care needed first.</p></div></li>';
      let elapsed=2,uncertain=false;
      for(const stage of t.stages){let label;
        if(dated)label=dateRange(stage.startMin,stage.endMax);
        else if(!stage.timing){label='Timing at assessment';uncertain=true;}
        else if(stage.timing.unit==='months'){label=stage.timing.min+'–'+stage.timing.max+' months';uncertain=true;}
        else if(uncertain)label=stage.timing.min===0?'Treatment appointment':stage.timing.min+' weeks';
        else {label=stage.timing.max===0?'Week '+(elapsed+1):'Weeks '+(elapsed+1)+'–'+(elapsed+stage.timing.max);elapsed+=stage.timing.max;}
        html+='<li><span class="tdbc-dot"></span><div><small class="text-size-tiny">'+esc(label)+'</small><strong>'+esc(stage.label)+'</strong>'+(stage.key==='whitening'?'<p>Three weeks of whitening, then two weeks for colour settling.</p>':'')+'</div></li>';
      }
      html+='</ol>'+t.plan.notes.map(n=>'<p class="tdbc-help text-size-tiny">'+esc(n)+'</p>').join('');return html;
    }
    change(event){
      const el=event.target;if(!this.ready)return;
      if(el.dataset.category){const k=el.dataset.category;if(el.checked)state.categories=[...new Set([...state.categories,k])];else{state.categories=state.categories.filter(c=>c!==k);C.OPTIONS.filter(o=>o.category===k).forEach(o=>delete state.selected[o.key]);}state.start='';if(!state.categories.length){state.assessment='none';state.finance=false;state.hygiene=false;}}
      else if(el.dataset.select){if(el.checked)state.selected[el.dataset.select]={qty:1,tier:null};else delete state.selected[el.dataset.select];state.start='';}
      else if(el.hasAttribute('data-finance'))state.finance=el.checked;
      else if(el.dataset.qty){const o=C.OPTIONS.find(o=>o.key===el.dataset.qty);const limit=o?.record==='fillings'||o?.key==='fillings'?160:32;state.selected[el.dataset.qty].qty=Math.max(1,Math.min(limit,Math.floor(Number(el.value)||1)));}
      else if(el.dataset.tier)state.selected[el.dataset.tier].tier=el.value===''?null:Number(el.value);
      else if(el.dataset.assessment)state.assessment=el.checked?el.dataset.assessment:'none';
      else if(el.hasAttribute('data-hygiene')){state.hygiene=el.checked;state.start='';}
      else if(el.hasAttribute('data-deposit-number'))state.deposit=Math.max(0,Math.round((Number(el.value)||0)*100));
      else if(el.dataset.date){state[el.dataset.date]=C.parseDate(el.value)?el.value:'';if(el.dataset.date==='target')state.start='';else if(state.start&&state.start<today())state.start=today();}
      else if(el.dataset.range){save();renderAll(this);return;}
      else return;
      state=C.normaliseState(state);renderAll();
    }
    input(event){const el=event.target,k=el.dataset.range;if(!this.ready||!k)return;
      if(k==='start'){state.start=C.iso(C.addDays(C.parseDate(today()),Number(el.value)));el.setAttribute('aria-valuetext',dateText(state.start));const d=this.root.querySelector('[data-date="start"]');if(d)d.value=state.start;}
      else{state[k]=Number(el.value);el.setAttribute('aria-valuetext',k==='term'?state.term+' months':currency(state.deposit));if(k==='deposit'){const n=this.root.querySelector('[data-deposit-number]');if(n)n.value=state.deposit/100;}}
      this.outputs();save();
    }
    click(event){const el=event.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;
      if(action==='info'){const info=el.closest('.tdbc-info'),open=!info.classList.contains('is-open');closeTooltips();info.classList.toggle('is-open',open);el.setAttribute('aria-expanded',String(open));const panel=info.querySelector('[role=tooltip]');panel.setAttribute('aria-hidden',String(!open));panel.inert=!open;return;}
      if(action==='estimate'){const summary=this.root.querySelector('.tdbc-summary');if(summary){focusMove=true;focusView(this);summary.focus({preventScroll:true});if(this.mode==='inline'&&window.lenis?.scrollTo)window.lenis.scrollTo(summary,{offset:-112,onComplete:()=>{focusMove=false;focusView(this);}});else summary.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>{focusMove=false;},1600);}return;}
      if(action==='retry'){this.init();return;}
      if(action==='vip'){event.preventDefault();releaseFocus();goVIP(el);return;}
      if(!this.ready)return;
      if(action==='reset'){releaseFocus();state=C.newState();this.context=null;try{sessionStorage.removeItem(STORAGE);}catch(_){} }
      else if(action==='start-assessment')state.assessment='signature';
      else if(action==='clear-tier'){if(state.selected[el.dataset.key])state.selected[el.dataset.key].tier=null;}
      else if(action==='breakdown')this.breakdown=!this.breakdown;
      else if(action==='plus'||action==='minus'){const o=C.OPTIONS.find(o=>o.key===el.dataset.key),v=state.selected[el.dataset.key];if(v)v.qty=Math.max(1,Math.min(o?.record==='fillings'||o?.key==='fillings'?160:32,v.qty+(action==='plus'?1:-1)));}
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
    makeDialog();lastTrigger=trigger;focusView(drawerView);const config=configFrom(trigger);
    try{window.TDBVIPDrawer?.reset?.();}catch(_){}
    if(!dialog.open){oldOverflow=document.documentElement.style.overflow;oldPadding=document.documentElement.style.paddingRight;const gap=innerWidth-document.documentElement.clientWidth;document.documentElement.style.overflow='hidden';if(gap>0)document.documentElement.style.paddingRight=gap+'px';scrollWasStopped=!!window.lenis?.isStopped;try{window.lenis?.stop?.();}catch(_){}dialog.showModal();}
    dialog.scrollTop=0;dialog.querySelector('[data-tdb-calc-close]').focus({preventScroll:true});
    if(!drawerView.ready){drawerView.config=config;await drawerView.init();}else{contextual(drawerView,config);drawerView.render();save();}
  }
  function close(restore=true){if(!dialog?.open)return;releaseFocus();dialog.close();document.documentElement.style.overflow=oldOverflow;document.documentElement.style.paddingRight=oldPadding;try{if(!scrollWasStopped)window.lenis?.start?.();}catch(_){}if(restore&&lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});renderAll(drawerView);}
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
    document.addEventListener('pointerdown',event=>{if(!event.target.closest('.tdbc-info'))closeTooltips();if(focusedView&&!event.target.closest('.tdb-calc,.tdbc-dialog'))releaseFocus();},{capture:true,passive:true});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.tdbc-info.is-open')){closeTooltips();event.preventDefault();event.stopImmediatePropagation();}},true);
    document.addEventListener('click',event=>{const a=event.target.closest(SELECTOR);if(!a||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;event.preventDefault();open(a);});
  }
  window.TDBCalculator=Object.freeze({version:C.VERSION,open,close,refresh:()=>{records=null;for(const v of views)v.init();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
