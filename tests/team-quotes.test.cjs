const test=require('node:test');
const assert=require('node:assert/strict');
const {chooseTeamQuotes,assignedPage}=require('../dist/tdb-team-quotes.js');
const seed=require('../src/reviews/team-quotes-seed.json');
test('existing quote allocation gives five distinct three-quote sets',()=>{
 const pages=['/','/first-visit','/services/cosmetic-dentist','/contact','/location'];
 const selected=pages.flatMap(page=>{const set=chooseTeamQuotes(seed,page);assert.equal(set.length,3);assert.deepEqual(set.map(r=>r.rank),[1,2,3]);return set;});
 assert.equal(new Set(selected.map(r=>r.text)).size,15);
 assert.equal(chooseTeamQuotes(seed,'/services/nervous-patient-care').length,0);
});
test('tags assign one canonical page, explicit page wins and paused content is excluded',()=>{
 const a={id:'a',text:'Approved quote',author:'David',tags:['nervous','cosmetic'],rank:1};
 assert.equal(assignedPage(a),'/services/nervous-patient-care');
 assert.equal(assignedPage({...a,page:'/FIRST-VISIT/'}),'/first-visit');
 assert.equal(chooseTeamQuotes([a],'/services/cosmetic-dentist').length,0);
 assert.equal(chooseTeamQuotes([{...a,active:false}],'/services/nervous-patient-care').length,0);
});
test('duplicate wording cannot be assigned to two pages and each slider has at most three quotes',()=>{
 const records=Array.from({length:4},(_,i)=>({id:String(i),text:'Quote '+i,author:'Keely',page:'/',rank:i+1}));
 records.push({...records[0],id:'copy',page:'/contact',rank:20});
 assert.equal(chooseTeamQuotes(records,'/').length,3);
 assert.equal(chooseTeamQuotes(records,'/contact').length,0);
});
