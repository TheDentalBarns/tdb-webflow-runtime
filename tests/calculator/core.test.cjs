'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../../src/calculator/core.js');
const fixture=require('./published-pricing.fixture.json');
const records=Object.fromEntries(fixture.map(f=>[f.record,C.recordFromFields(f)]));
const state=(keys,extra={})=>({...C.newState(),categories:['cosmetic','restorative'],selected:Object.fromEntries(keys.map(k=>[k,{qty:1,tier:null}])),...extra});
test('published records have valid prices; ambiguous and malformed prices fail visibly',()=>{
 assert.equal(Object.keys(records).length,13);for(const r of Object.values(records))assert.equal(r.valid,true,r.name);
 for(const p of ['POA','£100–£200','from 100','£0','£100 + fees','£1,00'])assert.equal(C.parsePrice(p),null);
 assert.deepEqual(C.parsePrice('From £1,295.50 per tooth'),{min:129550,from:true,unit:'tooth'});
 const broken={...records,[C.IDS.bonding]:{...records[C.IDS.bonding],valid:false}};
 const e=C.estimate(broken,state(['bonding']));assert.equal(e.complete,false);assert.equal(e.min,45000);assert.equal(C.finance(e,0,12),null);
});
test('assessment is manual before treatment, automatic once, never charges package constituents twice',()=>{
 assert.equal(C.estimate(records,C.newState()).min,0);
 assert.equal(C.estimate(records,state([],{assessment:'design'})).min,22500);
 assert.equal(C.estimate(records,state([],{assessment:'signature'})).min,45000);
 const e=C.estimate(records,state(['whitening'],{assessment:'design'}));assert.equal(e.min,124500);assert.equal(e.assessment,'signature');assert.equal(e.lines.filter(l=>l.key==='assessment').length,1);
 assert.equal(C.estimate(records,state([],{assessment:'design'})).min,22500);
});
test('quantities, uncertainty and selected tiers preserve CMS units and price ranges',()=>{
 const s=state(['bonding']);s.selected.bonding.qty=6;
 let e=C.estimate(records,s);assert.equal(e.min,282000);assert.equal(e.max,402000);assert.equal(e.starting,true);
 s.selected.bonding.tier=1;e=C.estimate(records,s);assert.equal(e.min,342000);assert.equal(e.max,342000);
 const f=state(['fillings','replacement']);f.selected.fillings.qty=2;f.selected.replacement.qty=3;
 e=C.estimate(records,f);assert.equal(e.min,252500);assert.equal(e.lines.find(l=>l.key==='fillings').record.unit,'surface');
});
test('aligners include whitening and hygiene in either selection order; removing aligners restores intent',()=>{
 for(const keys of [['whitening','aligners'],['aligners','whitening'],['aligners']]){
  const e=C.estimate(records,state(keys,{hygiene:true}));assert.equal(e.min,464500);assert.equal(e.max,684500);assert.equal(e.hygieneIncluded,true);assert.equal(e.whitenIncluded,true);
  assert.equal(e.lines.filter(l=>l.recordKey==='whitening').length,1);assert.equal(e.lines.find(l=>l.recordKey==='whitening').min,0);
 }
 const s=state(['aligners','whitening']);delete s.selected.aligners;
 const e=C.estimate(records,s);assert.equal(e.min,124500);assert.equal(e.whitenIncluded,false);
});
test('hygiene is explicit and charged only when selected and not included',()=>{
 const e=C.estimate(records,state(['whitening'],{hygiene:true}));assert.equal(e.min,144000);
 assert.equal(C.estimate(records,state(['rct'],{hygiene:true})).lines.some(l=>l.key==='hygiene'),false);
});
test('category restrictions disclose excluded choices, and never charge them',()=>{
 const e=C.estimate(records,state(['whitening','fillings']),{cosmetic:false,restorative:true});
 assert.deepEqual(e.hiddenSelections,['whitening']);assert.equal(e.min,74500);assert.equal(e.selected.length,1);
 assert.deepEqual(C.allowedOptions({cosmetic:false,restorative:false}),[]);
});
test('untrusted saved quantities and terms are bounded; inactive categories clear selections',()=>{
 const s=C.normaliseState({categories:['cosmetic'],selected:{bonding:{qty:999,tier:99},rct:{qty:2},aligners:{qty:30}},term:30,deposit:-50,target:'2026-02-30'});
 assert.equal(s.selected.bonding.qty,32);assert.equal(s.selected.bonding.tier,null);assert.equal(s.selected.aligners.qty,1);assert.equal(s.selected.rct,undefined);assert.equal(s.term,12);assert.equal(s.deposit,0);assert.equal(s.target,'');
});
test('finance includes the assessment once in a minimum £450 upfront payment',()=>{
 const e=C.estimate(records,state(['whitening'])),f=C.finance(e,55000,12);
 assert.equal(f.assessment,45000);assert.equal(f.low.balance,69500);assert.equal(f.low.monthly,5791);assert.equal(f.low.final,5799);
 assert.equal(f.deposit+f.low.monthly*11+f.low.final,e.min);
});
test('finance bounds, exact reconciliation and treatment removal',()=>{
 const e=C.estimate(records,state(['whitening']));
 assert.equal(C.finance(e,999999,3).low.balance,25000);assert.equal(C.finance(e,-100,3).low.monthly,26500);
 for(let balance=0;balance<9999;balance+=137)for(const term of [3,12]){const p=C.payment(balance,term);assert.equal(p.monthly*(term-1)+p.final,balance);}
 assert.equal(C.finance(e,300000,12).deposit,99500);
 assert.throws(()=>C.payment(100,13),RangeError);
});
test('CMS changes flow through without changing identifiers or code',()=>{
 const original=fixture.find(f=>f.record===C.IDS.whitening);
 const changed=C.recordFromFields({...original,label:'Brighter smile',price:'From £800','tier1':'£800'});
 const e=C.estimate({...records,[changed.id]:changed},state(['whitening']));assert.equal(e.min,125000);assert.equal(e.lines[1].label,'Brighter smile');
 assert.equal(C.recordFromFields({...original,price:'From £800'}).valid,false);
 assert.equal(C.recordFromFields({...original,label:'',name:'New canonical name'}).label,'New canonical name');
});
test('restorative work precedes cosmetic work with a two-week lead-in',()=>{
 const e=C.estimate(records,state(['rct','bonding','whitening','fillings'])),p=C.plan(records,e);
 assert.deepEqual(p.stages.map(s=>s.key),['fillings','rct','whitening','bonding']);
 const s=C.schedule(p,'2026-10-01');assert.equal(s.stages[0].startMin,'2026-10-15');assert.equal(s.stages[0].endMin,'2026-10-15');assert.equal(s.finishMin,'2026-12-17');
});
test('aligner uncertainty uses calendar months and retains whitening settling afterwards',()=>{
 const e=C.estimate(records,state(['aligners'])),s=C.schedule(C.plan(records,e),'2026-01-17');
 assert.deepEqual(s.stages.map(x=>x.key),['aligners','whitening']);assert.equal(s.finishMin,'2027-01-04');assert.equal(s.finishMax,'2027-09-04');
});
test('unknown clinical dependencies withhold precise dates rather than assuming zero',()=>{
 for(const keys of [['extractions'],['gumline'],['crowns','aligners'],['onlays','whitening']]){
  const t=C.timeline(records,C.estimate(records,state(keys)),'2028-12-01','2026-09-16');assert.equal(t.reliable,false);assert.equal(t.suggestedEarliest,null);assert.equal(t.finishMax,null);
 }
});
test('backward planning respects month ends, leap years and the requested finish',()=>{
 const p=C.plan(records,C.estimate(records,state(['aligners','bonding'])));
 for(const target of ['2028-02-29','2028-03-31','2027-12-31','2200-12-31'])for(const which of ['min','max']){
  const start=C.suggestedStart(p,target,which),s=C.schedule(p,start),next=C.schedule(p,C.iso(C.addDays(C.parseDate(start),1)));
  assert.ok(s[which==='min'?'finishMin':'finishMax']<=target);assert.ok(next[which==='min'?'finishMin':'finishMax']>target);
 }
 assert.equal(C.parseDate('2026-02-29'),null);assert.equal(C.iso(C.addMonths(C.parseDate('2028-01-31'),1)),'2028-02-29');
});
test('past/tight targets retain target and project from a non-past assessment',()=>{
 const e=C.estimate(records,state(['whitening']));
 const t=C.timeline(records,e,'2026-09-15','2026-09-16');assert.equal(t.targetPast,true);assert.equal(t.tight,true);assert.equal(t.start,'2026-09-16');assert.equal(t.finishMax,'2026-11-04');
 const moved=C.timeline(records,e,'2026-12-31','2026-09-16','2026-12-01');assert.equal(moved.target,'2026-12-31');assert.equal(moved.finishMax,'2027-01-19');assert.equal(moved.meetsTarget,false);
 const ancient=C.timeline(records,e,'1900-01-01','2026-09-16');assert.equal(ancient.targetPast,true);assert.equal(ancient.suggestedEarliest,null);
});

test('replacement always uses CMS tier 3 and restorative choices ignore stale tiers',()=>{
 const s=state(['replacement','crowns']);s.selected.replacement.tier=0;s.selected.crowns.tier=2;
 const e=C.estimate(records,s);assert.equal(e.lines.find(x=>x.key==='replacement').min,49500);assert.equal(e.lines.find(x=>x.key==='replacement').max,49500);assert.equal(e.lines.find(x=>x.key==='crowns').min,99500);
});
test('estimate ordering matches preparation, restorative and cosmetic sequence',()=>{
 const e=C.estimate(records,state(['veneers','aligners','fillings','rct','bonding']));
 assert.deepEqual(e.lines.map(x=>x.key),['assessment','hygiene','fillings','rct','aligners','whitening-included','bonding','veneers']);
 assert.equal(C.duration(records,C.estimate(records,state(['whitening'])),'2026-09-16'),'7 weeks');
 assert.equal(C.duration(records,C.estimate(records,state(['extractions'])),'2026-09-16'),'Timing at assessment');
});
test('borrowing threshold and deposit bounds reconcile across both ends of a range',()=>{
 assert.equal(C.finance(C.estimate(records,state(['gumline'])),0,12),null);
 const e=C.estimate(records,state(['bonding']));
 for(const deposit of [-1,45000,59500,999999])for(const term of [3,12]){const f=C.finance(e,deposit,term);assert.ok(f.deposit>=45000);assert.ok(f.low.balance>=25000);for(const [p,total]of [[f.low,e.min],[f.high,e.max]])assert.equal(f.deposit+p.monthly*(term-1)+p.final,total);}
});
test('completion planning starts at the earliest finish and shifts the whole plan later',()=>{
 const e=C.estimate(records,state(['whitening']));
 const first=C.completionTimeline(records,e,'2026-09-16');
 assert.equal(first.start,'2026-09-16');assert.equal(first.finishMin,'2026-11-04');assert.equal(first.offset,0);
 const later=C.completionTimeline(records,e,'2026-09-16',21);
 assert.equal(later.start,'2026-10-07');assert.equal(later.finishMin,'2026-11-25');assert.equal(later.stages[0].startMin,'2026-10-21');
 const early=C.completionTimeline(records,e,'2026-09-16',0,'2026-10-01');
 assert.equal(early.tooSoon,true);assert.equal(early.offset,0);assert.equal(early.finishMin,first.finishMin);
});
test('completion targets retain calendar uncertainty and withhold unknown clinical timing',()=>{
 const e=C.estimate(records,state(['aligners']));
 const t=C.completionTimeline(records,e,'2026-01-17');assert.equal(t.finishMin,'2027-01-04');assert.equal(t.finishMax,'2027-09-04');
 const selected=C.completionTimeline(records,e,'2026-01-17',0,'2028-02-29');
 assert.ok(selected.start>='2026-01-17');assert.ok(selected.finishMin<='2028-02-29');assert.ok(selected.finishMax>selected.finishMin);
 const unknown=C.completionTimeline(records,C.estimate(records,state(['extractions'])),'2026-09-16');assert.equal(unknown.reliable,false);assert.equal(unknown.earliestCompletion,null);
});
