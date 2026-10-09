import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extract,handle} from './worker.mjs';
const data={slug:'active','smile-release-time':'','smile-release-uk-time':'','next-signature-slot':'October 28, 2026','next-signature-uk-time':'13:40','smile-countdown-text':'Smile Design &amp; more','smile-waitlist-text':'Join &#86;IP','smile-booked-title':'Booked','signature-heading':'Signature &#x2726;','signature-availability-text':'Enquire'};
const html=(changes={})=>Object.entries({...data,...changes}).map(([key,value])=>`<div data-banner-field="${key}">${value}</div>`).join('');
const request=(path='/active.json',method='GET')=>new Request('https://feed.example.test'+path,{method});
test('projects only the expected public CMS fields and decodes text once',()=>{
  const fields=extract('<script>secret;'+html()+'</script>'+html()+'<div data-banner-field="private">secret</div>','active');
  assert.equal(Object.keys(fields).length,10);assert.equal(fields['smile-countdown-text'],'Smile Design & more');
  assert.equal(fields['smile-waitlist-text'],'Join VIP');assert.equal(fields['signature-heading'],'Signature ✦');assert.equal(fields.private,undefined);
  assert.throws(()=>extract(html()+html(),'active'));assert.throws(()=>extract(html({slug:'preview'}),'active'));
  assert.throws(()=>extract(html().replace('<div data-banner-field="slug">active</div>',''),'active'));
});
test('cache hits retain source time and manual refresh bypasses the cache',async()=>{
  let calls=0,time=1000;const entries=new Map(),pending=[];
  const options={now:()=>time,fetcher:async(url,init)=>{calls++;assert.equal(url,'https://dentalbarns.webflow.io/banner-settings/active');assert.equal(init.credentials,'omit');return new Response(html());},cache:{match:async key=>entries.get(key.url)?.clone(),put:async(key,response)=>entries.set(key.url,response)},waitUntil:p=>pending.push(p)};
  const first=await handle(request(),options);assert.equal(first.status,200);assert.equal((await first.json()).checkedAt,1000);await Promise.all(pending);
  time=2000;const hit=await handle(request(),options);assert.equal((await hit.json()).checkedAt,1000);assert.equal(calls,1);
  const fresh=await handle(request('/active.json?refresh=1'),options);assert.equal((await fresh.json()).checkedAt,2000);assert.equal(calls,2);
});
test('bad methods and routes cannot trigger upstream requests; preview is separate',async()=>{
  const options={fetcher:async(url)=>{assert.equal(url,'https://dentalbarns.webflow.io/banner-settings/preview');return new Response(html({slug:'preview'}));}};
  assert.equal((await handle(request('/arbitrary'),options)).status,404);
  assert.equal((await handle(request('/active.json','POST'),options)).status,405);
  assert.equal((await handle(request('/active.json','OPTIONS'),options)).status,204);
  const response=await handle(request('/preview.json'),options);assert.equal((await response.json()).channel,'preview');assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');
});
test('failed or malformed upstream data is not cached or exposed',async()=>{
  for(const fetcher of [async()=>{throw Error('private detail');},async()=>new Response('oops',{status:500}),async()=>new Response(html({slug:'wrong'}))]){
    const response=await handle(request(),{fetcher,cache:{match:async()=>null,put:async()=>{assert.fail('Must not cache errors');}}});
    assert.equal(response.status,503);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal((await response.json()).error,'Availability temporarily unavailable');
  }
});
