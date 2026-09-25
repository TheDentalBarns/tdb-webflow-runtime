const test=require('node:test');
const assert=require('node:assert/strict');
const {chooseReviews,safeURL}=require('../dist/tdb-review-drawer.js');
const r=(id,extra={})=>({id,topics:[],platform:'Google',rank:10,nRank:999,iRank:999,lRank:999,date:'2025-01-01',...extra});
test('relevant ordering keeps all reviews and prioritises matching care',()=>{
 const records=[r('generic',{rank:1}),r('nervous',{topics:['nervous'],nRank:2})];
 assert.deepEqual(chooseReviews(records,{context:'nervous'}).map(x=>x.id),['nervous','generic']);
});
test('snippet entry opens its exact source even across duplicate platforms',()=>{
 const records=[r('google',{duplicate:'same'}),r('facebook',{platform:'Facebook',duplicate:'same'})];
 assert.deepEqual(chooseReviews(records,{preferredId:'facebook'}).map(x=>x.id),['facebook']);
 assert.deepEqual(chooseReviews(records,{platform:'Google'}).map(x=>x.id),['google']);
});
test('newest ignores editorial preference and filters before deduplicating',()=>{
 const records=[r('old',{topics:['nervous'],date:'2020-01-01'}),r('new',{topics:['nervous'],date:'2026-01-01'}),r('other',{date:'2026-09-01'})];
 assert.deepEqual(chooseReviews(records,{topic:'nervous',sort:'newest',preferredId:'old'}).map(x=>x.id),['new','old']);
});
test('source links reject script/data and non-HTTPS URLs',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,x','http://example.com','/unknown'])assert.equal(safeURL(url),'');
 assert.equal(safeURL('https://www.facebook.com/thedentalbarns/'),'https://www.facebook.com/thedentalbarns/');
});
