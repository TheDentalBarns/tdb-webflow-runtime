/* TDB Treatment Calculator v1.0.0 — shared inline/drawer controller. */
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
      const f={record:id};for(const key of ['name','label','price','tooltip','min','max','unit','deposit','tier1','tier2','tier3','tier4','tier5'])f[key]=el.getAttribute('data-'+key)||'';
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
    for(const key of ['cosmetic','restorative','finance']){const marker=host.querySelector('[data-tdb-calc-toggle="'+key+'"]');config[key]=nativeConfig?!!marker&&!marker.classList.contains('w-condition-invisible'):key==='finance'?el.getAttribute('data-finance')==='true':el.getAttribute('data-'+key)!=='false';}
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
    if(!state.categories.length){if(config.cosmetic&&!config.restorative)state.categories=['cosmetic'];if(!config.cosmetic&&config.restorative)state.categories=['restorative'];}
  }
  class View {
    constructor(root,config,mode){this.root=root;this.config=config;this.mode=mode;this.id='tdbc-'+(++sequence);this.context=null;this.ready=false;this.stageOpen=false;
      root.classList.add('tdb-calc');root.addEventListener('change',e=>this.change(e));root.addEventListener('input',e=>this.input(e));root.addEventListener('click',e=>this.click(e));views.push(this);}
    async init(){this.root.setAttribute('aria-busy','true');try{await getRecords();this.ready=true;contextual(this,this.config);this.render();renderAll(this);}catch(_){this.root.innerHTML='<div class="tdbc-shell"><h2>Explore your treatment costs</h2><p>We couldn’t load the current prices. Please try again or view our fee guide.</p><button type="button" class="tdbc-button" data-action="retry">Try again</button> <a href="'+PRICE_PATH+'">View fees</a></div>';}finally{this.root.removeAttribute('aria-busy');}}
    focusKey(){const a=document.activeElement;return this.root.contains(a)?a?.getAttribute('data-control'):null;}
    render(){
      if(!this.ready)return;
      const focus=this.focusKey(),details=[...this.root.querySelectorAll('details[open]')].map(d=>d.dataset.detail);
      const e=C.estimate(records,state,this.config),id=this.id;
      if(e.hiddenSelections.length&&!this.context){this.context={...this.config};this.config.cosmetic=this.config.restorative=true;return this.render();}
      const selected=e.selected.length,available=C.allowedOptions(this.config);
      this.root.innerHTML='<div class="tdbc-shell">'+
        '<header class="tdbc-header"><p class="tdbc-kicker">YOUR SMILE, YOUR POSSIBILITIES</p><h2'+(this.mode==='drawer'?' id="tdbc-dialog-title"':'')+'>Explore your treatment costs</h2><p>Start with what matters to you. We’ll bring together a guide to your investment and timing.</p></header>'+
        (this.context?'<div class="tdbc-notice"><p>Your existing estimate is saved. Continue with it, or start with the options from this page.</p><div class="tdbc-actions"><button type="button" data-action="keep" class="tdbc-text-button">Keep my estimate</button><button type="button" data-action="context" class="tdbc-text-button">Start with these options</button></div></div>':'')+
        '<div class="tdbc-live" aria-live="polite" aria-atomic="true"><span>'+tag+' Your estimate</span><strong data-output="live">'+esc(priceText(e))+'</strong></div>'+
        '<div class="tdbc-layout"><div class="tdbc-main">'+
        '<fieldset class="tdbc-step"><legend><span class="tdbc-number">01</span> What would you like to explore?</legend><p class="tdbc-help">Choose one or both.</p><div class="tdbc-categories">'+
        ['cosmetic','restorative'].filter(k=>this.config[k]).map(k=>'<label class="tdbc-category '+(state.categories.includes(k)?'is-selected':'')+'"><input type="checkbox" data-control="category-'+k+'" data-category="'+k+'" '+(state.categories.includes(k)?'checked':'')+'><span><strong>'+(k==='cosmetic'?'Cosmetic':'Restorative')+'</strong><small>'+(k==='cosmetic'?'Improve my smile':'Restore my teeth')+'</small></span><span class="tdbc-check" aria-hidden="true"></span></label>').join('')+'</div></fieldset>'+
        (state.categories.length?'<section class="tdbc-step"><h3><span class="tdbc-number">02</span> Shape your estimate</h3><p class="tdbc-help">Explore freely. Your dentist will help confirm the right treatments.</p>'+['cosmetic','restorative'].filter(k=>state.categories.includes(k)&&this.config[k]).map(k=>'<fieldset class="tdbc-treatment-group"><legend>'+ (k==='cosmetic'?'Cosmetic treatments':'Restorative treatments')+'</legend>'+available.filter(o=>o.category===k).map(o=>this.option(o,e)).join('')+'</fieldset>').join('')+'</section>':'')+
        (selected?this.assessment(e):'<details class="tdbc-starting-option" data-detail="starting"><summary>Explore the starting assessment</summary>'+this.assessment(e)+'</details>')+
        (e.cosmetic?this.hygiene(e):'')+
        (selected&&this.config.finance?this.financeControls(e):'')+
        (selected?this.timelineControls(e):'')+
        '</div><aside class="tdbc-summary" aria-label="Your estimated investment"><div data-output="summary"></div></aside></div>'+
        '<footer class="tdbc-footnote">A guide to possibilities, subject to assessment and your confirmed treatment plan. Your selections stay in this tab for up to four hours. <button type="button" class="tdbc-text-button" data-action="reset" data-control="reset">Reset estimate</button></footer></div>';
      this.outputs();
      for(const d of this.root.querySelectorAll('details'))if(details.includes(d.dataset.detail))d.open=true;
      if(focus){const el=[...this.root.querySelectorAll('[data-control]')].find(x=>x.dataset.control===focus);el?.focus({preventScroll:true});}
    }
    option(o,e){
      const r=records[C.IDS[o.record||o.key]],v=state.selected[o.key],on=!!v,included=o.key==='whitening'&&e.whitenIncluded;
      const label=name(o),rid=this.id+'-'+o.key,quantityUnit=r?.unit||(o.quantity?'tooth':'');
      return '<div class="tdbc-option '+(on||included?'is-selected':'')+'"><div class="tdbc-option-row"><label class="tdbc-option-label" for="'+rid+'"><input id="'+rid+'" type="checkbox" data-control="select-'+o.key+'" data-select="'+o.key+'" '+(on||included?'checked ':'')+(included?'disabled ':'')+'><span class="tdbc-check" aria-hidden="true"></span><span><strong>'+esc(label)+'</strong><small>'+(included?'Included with your aligners':esc(recordPrice(r)))+'</small></span></label><details class="tdbc-info" data-detail="'+o.key+'"><summary aria-label="About '+esc(label)+'">i</summary><p>'+esc(r?.tooltip||'Your dentist will confirm suitability, fees and the treatment sequence at your assessment.')+(o.key==='replacement'?' Count the surfaces to be replaced. Keep these separate from any new fillings below.':'')+'</p></details></div>'+
      (on&&!included?'<div class="tdbc-option-controls">'+(o.quantity?'<label for="'+rid+'-qty">'+(quantityUnit==='surface'?'Surfaces to restore':'Number of teeth')+'</label><div class="tdbc-quantity"><button type="button" data-action="minus" data-key="'+o.key+'" aria-label="Fewer '+esc(label)+'" '+(v.qty<=1?'disabled':'')+'>−</button><input id="'+rid+'-qty" data-control="qty-'+o.key+'" data-qty="'+o.key+'" type="number" inputmode="numeric" min="1" max="'+(quantityUnit==='surface'?160:32)+'" step="1" value="'+v.qty+'"><button type="button" data-action="plus" data-key="'+o.key+'" aria-label="More '+esc(label)+'">+</button></div>'+(quantityUnit==='surface'?'<p class="tdbc-help">One tooth may need several surfaces restored. If unsure, use one surface for a starting guide.</p>':''):'')+
      (r?.tiers.length>1?'<label class="tdbc-tier-label" for="'+rid+'-tier">'+(o.key==='aligners'?'Treatment complexity':'Pricing tier')+'</label><select id="'+rid+'-tier" data-control="tier-'+o.key+'" data-tier="'+o.key+'"><option value="" '+(v.tier===null?'selected':'')+'>I’m not sure — show a range</option>'+r.tiers.map((p,i)=>'<option value="'+i+'" '+(v.tier===i?'selected':'')+'>Tier '+(i+1)+' · '+esc(currency(p))+(r.unit?' / '+r.unit:'')+'</option>').join('')+'</select><p class="tdbc-help">Your dentist confirms the appropriate tier.</p>':'')+'</div>':'')+'</div>';
    }
    assessment(e){
      const a=records[C.IDS.assessment],d=records[C.IDS.design];
      return '<section class="tdbc-step tdbc-assessment"><p class="tdbc-kicker">EVERY JOURNEY STARTS HERE</p><h3>'+esc(a?.label||'Signature Assessment ✦')+'</h3><p>Smile Design and a comprehensive examination, together with Dr Keely.</p><ul class="tdbc-included"><li><span>Smile Design</span><span>Included</span></li><li><span>Comprehensive examination & appropriate diagnostics</span><span>Included</span></li><li><span>Itemised plan, costs & written report</span><span>Included</span></li></ul>'+
      '<div class="tdbc-assessment-price"><strong>'+esc(recordPrice(a))+'</strong><span>'+esc(a?.bookingDeposit!==null&&a?.bookingDeposit!==undefined?currency(a.bookingDeposit)+' booking deposit, included in the total':'Booking details confirmed with your appointment')+'</span></div>'+
      (e.required?'<p class="tdbc-help">Automatically included once in your estimate. No separate examination or Smile Design fees are added.</p>':'<label class="tdbc-manual"><input type="checkbox" data-control="assessment" data-assessment="signature" '+(state.assessment==='signature'?'checked':'')+'> Include Signature Assessment</label>'+(d?.valid?'<label class="tdbc-manual"><input type="checkbox" data-control="design" data-assessment="design" '+(state.assessment==='design'?'checked':'')+'> Explore Smile Design only · '+esc(recordPrice(d))+'</label><p class="tdbc-help">Selecting treatment combines your starting care into Signature Assessment.</p>':''))+'</section>';
    }
    hygiene(e){const r=records[C.IDS.hygiene];return '<section class="tdbc-step tdbc-preparation"><h3>Healthy foundations first</h3><p>We’ll review your gum health before cosmetic treatment.</p>'+(e.hygieneIncluded?'<p class="tdbc-inclusion">Airflow® hygiene is included with your aligner package.</p>':'<p class="tdbc-help">Hygiene is recommended where needed and is not yet included in this estimate.</p><label class="tdbc-manual"><input type="checkbox" data-control="hygiene" data-hygiene '+(state.hygiene?'checked':'')+'> Add a hygiene allowance · '+esc(recordPrice(r))+'</label>')+'<p class="tdbc-help">Any additional periodontal care will be discussed after assessment.</p></section>';}
    financeControls(e){const f=C.finance(e,state.deposit,state.term);return '<section class="tdbc-step"><h3>'+tag+' Spread your investment</h3><p class="tdbc-help">Would you like a monthly payment illustration?</p><div class="tdbc-toggle" role="group" aria-label="Explore finance"><button type="button" data-action="finance-no" data-control="finance-no" aria-pressed="'+!state.finance+'">No</button><button type="button" data-action="finance-yes" data-control="finance-yes" aria-pressed="'+state.finance+'">Yes, explore 0%</button></div>'+(state.finance&&f?'<div class="tdbc-finance-controls"><label for="'+this.id+'-deposit">Treatment deposit <output data-output="deposit">'+esc(currency(f.deposit))+'</output></label><input id="'+this.id+'-deposit" type="range" min="0" max="'+f.limit+'" step="100" value="'+f.deposit+'" data-control="deposit" data-range="deposit" aria-valuetext="'+esc(currency(f.deposit))+'"><label class="tdbc-sr" for="'+this.id+'-deposit-value">Treatment deposit in pounds</label><input id="'+this.id+'-deposit-value" type="number" min="0" max="'+(f.limit/100)+'" step="1" value="'+(f.deposit/100)+'" data-control="deposit-number" data-deposit-number><label for="'+this.id+'-term">Illustrative term <output data-output="term">'+state.term+' months</output></label><input id="'+this.id+'-term" type="range" min="3" max="12" step="1" value="'+state.term+'" data-control="term" data-range="term" aria-valuetext="'+state.term+' months"><div class="tdbc-range-labels"><span>3 months</span><span>12 months</span></div><div data-output="finance"></div><p class="tdbc-help">Illustration only. Available terms, minimum borrowing and deposit requirements are confirmed with your treatment plan, subject to eligibility and lender approval. The assessment is shown separately.</p></div>':state.finance?'<p>Complete pricing is needed before we can show a monthly illustration.</p>':'')+'</section>';}
    timelineControls(e){const t=C.timeline(records,e,state.target,today(),state.start);return '<section class="tdbc-step"><h3>'+clock+' A date to look forward to</h3><p class="tdbc-help">An occasion in mind? Explore when your journey might begin.</p><label for="'+this.id+'-target">Target completion date <span class="tdbc-optional">Optional</span></label><input id="'+this.id+'-target" type="date" data-control="target" data-date="target" value="'+esc(state.target)+'"><div data-output="timeline"></div>'+(t.reliable&&state.target&&t.suggestedEarliest?'<div class="tdbc-date-controls"><label for="'+this.id+'-start">Explore an assessment date</label><input id="'+this.id+'-start" type="date" data-control="start" data-date="start" value="'+t.start+'" min="'+today()+'"><label class="tdbc-sr" for="'+this.id+'-date-slider">Move the assessment earlier or later</label><input id="'+this.id+'-date-slider" type="range" data-control="date-slider" data-range="start" min="0" max="'+Math.max(1095,Math.ceil((C.parseDate(t.start)-C.parseDate(today()))/86400000)+365)+'" step="1" value="'+Math.round((C.parseDate(t.start)-C.parseDate(today()))/86400000)+'" aria-valuetext="'+esc(dateText(t.start))+'"><div class="tdbc-range-labels"><span>Earlier</span><span>Later</span></div><p class="tdbc-help">This explores timing; it does not book or check available appointments.</p></div>':'')+'</section>';}
    outputs(){
      const e=C.estimate(records,state,this.config),summary=this.root.querySelector('[data-output="summary"]');
      const f=C.finance(e,state.deposit,state.term);
      if(f&&state.deposit!==f.deposit){state.deposit=f.deposit;save();}
      const live=this.root.querySelector('[data-output="live"]');if(live&&live.textContent!==priceText(e))live.textContent=priceText(e);
      if(summary)summary.innerHTML='<p class="tdbc-kicker">YOUR ESTIMATED INVESTMENT</p><div class="tdbc-total">'+esc(priceText(e))+'</div>'+(e.min!==e.max?'<p class="tdbc-help">Guide range across the published pricing tiers.</p>':'')+
      (e.lines.length?'<details class="tdbc-breakdown" data-detail="breakdown" open><summary>View your breakdown</summary><ul>'+e.lines.map(l=>'<li><span>'+esc(l.label)+(l.qty>1?' <small>× '+l.qty+(l.record?.unit==='surface'?' surfaces':' teeth')+'</small>':'')+'</span><strong>'+(l.included?'Included':l.min===null?'To confirm':esc(range(l.min,l.max)))+'</strong></li>').join('')+'</ul></details>':'<p>Select the treatments you’d like to explore. Your estimate will appear here.</p>')+
      (!e.complete?'<p class="tdbc-warning">Some prices need confirmation: '+esc(e.missing.join(', '))+'. The subtotal excludes these items.</p>':'')+
      (e.cosmetic&&!e.hygieneIncluded&&!state.hygiene?'<p class="tdbc-help">Hygiene, if needed, is additional.</p>':'')+
      (state.finance&&this.config.finance&&f?'<div class="tdbc-summary-monthly"><span>0% illustration over '+state.term+' months</span><strong>'+esc(range(f.low.monthly,f.high.monthly))+'<small> / month</small></strong><span>Assessment and treatment deposit paid separately.</span></div>':'')+
      '<a class="tdbc-button tdbc-button-light" href="/vip" data-action="vip">Join VIP <span aria-hidden="true">↗</span></a><p class="tdbc-help">Discuss your options and take the next step with us.</p>';
      const financeOut=this.root.querySelector('[data-output="finance"]');
      if(financeOut&&f)financeOut.innerHTML='<dl class="tdbc-finance-facts"><div><dt>Treatment guide</dt><dd>'+esc(range(e.min-(e.assessmentLine?.min||0),e.max-(e.assessmentLine?.max||0)))+'</dd></div><div><dt>Treatment deposit</dt><dd>'+esc(currency(f.deposit))+'</dd></div><div><dt>Amount to spread</dt><dd>'+esc(range(f.low.balance,f.high.balance))+'</dd></div><div><dt>Monthly payment at 0%</dt><dd>'+esc(range(f.low.monthly,f.high.monthly))+'</dd></div><div><dt>Final payment</dt><dd>'+esc(range(f.low.final,f.high.final))+'</dd></div><div><dt>Assessment, paid separately</dt><dd>'+esc(currency(f.assessment))+'</dd></div></dl>'+(f.high.balance===0?'<p>No treatment balance remains to spread.</p>':'');
      const depositOut=this.root.querySelector('[data-output="deposit"]');if(depositOut)depositOut.textContent=currency(f?.deposit||0);
      const termOut=this.root.querySelector('[data-output="term"]');if(termOut)termOut.textContent=state.term+' months';
      const tOut=this.root.querySelector('[data-output="timeline"]');if(tOut)tOut.innerHTML=this.timelineOutput(e);
    }
    timelineOutput(e){
      const t=C.timeline(records,e,state.target,today(),state.start),dated=!!state.target&&t.reliable&&!!t.suggestedEarliest;
      let html='';
      if(t.plan.unknown.length)html+='<p class="tdbc-notice">We can map your treatment stages, but need to assess '+esc(t.plan.unknown.join(', '))+' before suggesting a completion date.</p>';
      if(t.targetPast)html+='<p class="tdbc-warning">Your target date has passed. Choose a future date to explore your options.</p>';
      else if(t.tight)html+='<p class="tdbc-notice">Your target date may be tight. We’re used to helping patients plan around important occasions. At your assessment, we can explore what may be achievable, including a staged approach.</p>';
      if(dated){html+='<div class="tdbc-date-result"><span>To aim for '+esc(dateText(state.target))+'</span><strong>Assessment '+esc(dateRange(t.suggestedEarliest,t.suggestedLatest))+'</strong><p>'+(t.suggestedEarliest!==t.suggestedLatest?'The earlier date allows for the longer treatment estimate.':'Based on the illustrative sequence below.')+'</p></div><div class="tdbc-date-result is-current"><span>Your explored assessment: '+esc(dateText(t.start))+'</span><strong>Estimated finish '+esc(dateRange(t.finishMin,t.finishMax))+'</strong><p>'+(t.meetsTarget?'This guide fits within your target date.':'This guide may extend beyond your target date.')+'</p></div>';}
      html+='<ol class="tdbc-timeline"><li><span class="tdbc-dot"></span><div><small>'+(dated?esc(dateText(t.start)):'Week 1')+'</small><strong>Signature Assessment ✦</strong><p>Smile Design, examination and your treatment plan.</p></div></li><li><span class="tdbc-dot"></span><div><small>'+(dated?esc(dateRange(t.start,C.iso(C.addDays(C.parseDate(t.start),14)))):'Two-week allowance after assessment')+'</small><strong>Prepare for treatment</strong><p>Plan your appointments and any care needed first.</p></div></li>';
      let elapsed=2,uncertain=false;
      for(const stage of t.stages){let label;
        if(dated)label=dateRange(stage.startMin,stage.endMax);
        else if(!stage.timing){label='Timing at assessment';uncertain=true;}
        else if(stage.timing.unit==='months'){label=stage.timing.min+'–'+stage.timing.max+' months';uncertain=true;}
        else if(uncertain)label=stage.timing.min===0?'Treatment appointment':stage.timing.min+' weeks';
        else {label=stage.timing.max===0?'Week '+(elapsed+1):'Weeks '+(elapsed+1)+'–'+(elapsed+stage.timing.max);elapsed+=stage.timing.max;}
        html+='<li><span class="tdbc-dot"></span><div><small>'+esc(label)+'</small><strong>'+esc(stage.label)+'</strong>'+(stage.key==='whitening'?'<p>Three weeks of whitening, then two weeks for colour settling.</p>':'')+'</div></li>';
      }
      html+='</ol>'+t.plan.notes.map(n=>'<p class="tdbc-help">'+esc(n)+'</p>').join('');return html;
    }
    change(event){
      const el=event.target;if(!this.ready)return;
      if(el.dataset.category){const k=el.dataset.category;if(el.checked)state.categories=[...new Set([...state.categories,k])];else{state.categories=state.categories.filter(c=>c!==k);C.OPTIONS.filter(o=>o.category===k).forEach(o=>delete state.selected[o.key]);}state.start='';}
      else if(el.dataset.select){if(el.checked)state.selected[el.dataset.select]={qty:1,tier:null};else delete state.selected[el.dataset.select];state.start='';}
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
      if(action==='retry'){this.init();return;}
      if(action==='vip'){event.preventDefault();goVIP(el);return;}
      if(!this.ready)return;
      if(action==='reset'){state=C.newState();this.context=null;try{sessionStorage.removeItem(STORAGE);}catch(_){} }
      else if(action==='finance-yes')state.finance=true;
      else if(action==='finance-no')state.finance=false;
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
    makeDialog();lastTrigger=trigger;const config=configFrom(trigger);
    try{window.TDBVIPDrawer?.reset?.();}catch(_){}
    if(!dialog.open){oldOverflow=document.documentElement.style.overflow;oldPadding=document.documentElement.style.paddingRight;const gap=innerWidth-document.documentElement.clientWidth;document.documentElement.style.overflow='hidden';if(gap>0)document.documentElement.style.paddingRight=gap+'px';scrollWasStopped=!!window.lenis?.isStopped;try{window.lenis?.stop?.();}catch(_){}dialog.showModal();}
    dialog.scrollTop=0;dialog.querySelector('[data-tdb-calc-close]').focus({preventScroll:true});
    if(!drawerView.ready){drawerView.config=config;await drawerView.init();}else{contextual(drawerView,config);drawerView.render();save();}
  }
  function close(restore=true){if(!dialog?.open)return;dialog.close();document.documentElement.style.overflow=oldOverflow;document.documentElement.style.paddingRight=oldPadding;try{if(!scrollWasStopped)window.lenis?.start?.();}catch(_){}if(restore&&lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});renderAll(drawerView);}
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
      // Keep the compact estimate below the site's existing announcement bar.
      const banner=document.querySelector('.eapps-countdown-timer-position-bar');
      const inset=()=>root.style.setProperty('--calc-sticky-top',Math.max(68,Math.ceil(banner?.getBoundingClientRect().height||0)+8)+'px');
      inset();if(banner&&'ResizeObserver'in window)new ResizeObserver(inset).observe(banner);
      new View(root,configFrom(root),'inline').init();});
    document.addEventListener('click',event=>{const a=event.target.closest(SELECTOR);if(!a||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;event.preventDefault();open(a);});
  }
  window.TDBCalculator=Object.freeze({version:C.VERSION,open,close,refresh:()=>{records=null;for(const v of views)v.init();}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
