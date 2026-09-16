/* TDB Treatment Calculator v1.0.0 — deterministic pricing and planning rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TDBCalculatorCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const VERSION = '1.0.0';
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
        s.selected[o.key]={qty:o.quantity?clamp(Math.floor(Number(v.qty)||1),1,o.record==='fillings'||o.key==='fillings'?160:32):1,tier:Number.isInteger(v.tier)&&v.tier>=0&&v.tier<=4?v.tier:null};
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
    // Assessment is paid separately. Never finance or subtract its booking deposit again.
    const assessmentMin=estimate.assessmentLine?.min||0,assessmentMax=estimate.assessmentLine?.max||0;
    const min=Math.max(0,estimate.min-assessmentMin),max=Math.max(0,estimate.max-assessmentMax);
    const actualDeposit=clamp(Math.round(Number(deposit)||0),0,min),months=clamp(Math.round(Number(term)||12),3,12);
    return {deposit:actualDeposit,limit:min,assessment:assessmentMin,low:payment(min-actualDeposit,months),high:payment(max-actualDeposit,months)};
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
  return Object.freeze({VERSION,IDS,OPTIONS,parsePrice,recordFromFields,newState,normaliseState,allowedOptions,estimate,payment,finance,parseDate,iso,addDays,addMonths,plan,schedule,suggestedStart,timeline});
});
