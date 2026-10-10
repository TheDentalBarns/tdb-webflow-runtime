import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {project,handle} from './worker.mjs';
const ids={active:'6aae67a1e8b724b14bafae67',preview:'6aae68e7f97f052a1ef8eeac'};
const data={slug:'active','smile-release-time':null,'smile-release-uk-time':null,'next-signature-slot':'2026-10-28T13:40:00.000Z','next-signature-uk-time':'13:40','smile-countdown-text':'Smile Design & more','smile-waitlist-text':'Join VIP','smile-booked-title':'Booked','signature-heading':'Signature ✦','signature-availability-text':'Enquire'};
const item=(changes={},channel='active')=>({id:ids[channel],isDraft:false,isArchived:false,lastPublished:'2026-10-09T15:05:40.340Z',fieldData:{...data,slug:channel,...changes}});
const request=(path='/active.json',method='GET')=>new Request('https://feed.example.test'+path,{method});
const token='test-only-secret';
test('projects only ten public fields; optional nulls become empty strings',()=>{
  const fields=project(item({name:'Private label',other:'secret','smile-countdown-text':'A &amp; B'}),'active');
  assert.equal(Object.keys(fields).length,10);assert.equal(fields.name,undefined);assert.equal(fields.other,undefined);
  assert.equal(fields['smile-release-time'],'');assert.equal(fields['next-signature-slot'],'2026-10-28');
  assert.equal(fields['smile-countdown-text'],'A &amp; B'); // API text is not HTML-encoded.
});
test('rejects wrong identity, drafts, archived items and invalid fields',()=>{
  for(const change of [{id:ids.preview},{isDraft:true},{isArchived:true},{lastPublished:null},{fieldData:{...data,slug:'preview'}},{fieldData:{...data,'next-signature-slot':'2026-02-30T00:00:00.000Z'}},{fieldData:{...data,'next-signature-uk-time':null}},{fieldData:{...data,'signature-heading':{} }},{fieldData:{...data,'signature-heading':'x'.repeat(2049)}}])assert.throws(()=>project({...item(),...change},'active'));
});
test('CMS calendar dates work with the existing browser UK-time parser in winter and summer',()=>{
  const context={window:{},location:{hostname:'example.test',search:''},URLSearchParams,document:{querySelector:()=>null,addEventListener:()=>{}},addEventListener:()=>{},dispatchEvent:()=>{},Event,Intl,Date};
  vm.runInNewContext(readFileSync(new URL('../../src/shared/availability.js',import.meta.url),'utf8'),context);
  for(const [date,clock,expected] of [['2026-10-28T13:40:00.000Z','13:40','2026-10-28T13:40:00.000Z'],['2026-09-25T08:00:00.000Z','09:00','2026-09-25T08:00:00.000Z']]){
    const fields=project(item({'next-signature-slot':date,'next-signature-uk-time':clock}),'active');
    assert.equal(context.window.TDBAvailability.ukDate(fields['next-signature-slot'],clock),expected);
  }
});
test('authenticated requests use fixed live endpoint; cache retains time and refresh bypasses it',async()=>{
  let calls=0,time=1000;const entries=new Map(),pending=[];
  const options={token,now:()=>time,fetcher:async(url,init)=>{calls++;assert.equal(url,'https://api.webflow.com/v2/collections/6aae66a4a90480deba7364b1/items/'+ids.active+'/live');assert.equal(init.headers.Authorization,'Bearer '+token);assert.equal(init.redirect,'error');return Response.json(item());},cache:{match:async key=>entries.get(key.url)?.clone(),put:async(key,response)=>entries.set(key.url,response)},waitUntil:p=>pending.push(p)};
  const first=await handle(request(),options);assert.equal(first.status,200);assert.equal((await first.json()).checkedAt,1000);await Promise.all(pending);
  time=2000;const hit=await handle(request(),options);assert.equal((await hit.json()).checkedAt,1000);assert.equal(calls,1);assert.equal(hit.headers.get('Cache-Control'),'no-store');
  const fresh=await handle(request('/active.json?refresh=1'),options);assert.equal((await fresh.json()).checkedAt,2000);assert.equal(calls,2);
});
test('routes, preview identity and HEAD/OPTIONS behaviour',async()=>{
  let calls=0;
  const options={token,fetcher:async(url)=>{calls++;assert.equal(url,'https://api.webflow.com/v2/collections/6aae66a4a90480deba7364b1/items/'+ids.preview+'/live');return Response.json(item({},'preview'));}};
  assert.equal((await handle(request('/arbitrary'),options)).status,404);
  assert.equal((await handle(request('/active.json','POST'),options)).status,405);
  assert.equal((await handle(request('/active.json','OPTIONS'),options)).status,204);assert.equal(calls,0);
  const response=await handle(request('/preview.json'),options);assert.equal((await response.json()).channel,'preview');assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');
  const head=await handle(request('/preview.json','HEAD'),options);assert.equal(head.status,200);assert.equal(await head.text(),'');
});
test('missing token and failed upstream never expose credentials or cache failures',async()=>{
  assert.equal((await handle(request(),{fetcher:()=>assert.fail('No request without secret')})).status,503);
  for(const fetcher of [async()=>{throw Error(token);},async()=>new Response(token,{status:401}),async()=>new Response('oops'),async()=>Response.json(item({slug:'wrong'}))]){
    const response=await handle(request(),{token,fetcher,cache:{match:async()=>null,put:async()=>assert.fail('Must not cache errors')}});
    assert.equal(response.status,503);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{error:'Availability temporarily unavailable'});
  }
});
