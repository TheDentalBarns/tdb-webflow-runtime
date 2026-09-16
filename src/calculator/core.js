/* TDB Treatment Calculator v1.4.0 — deterministic pricing and planning rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TDBCalculatorCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const VERSION = '1.4.0';
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
    if(!e.required)return e.assessmentLine?'Assessment only':'Choose treatments';
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
