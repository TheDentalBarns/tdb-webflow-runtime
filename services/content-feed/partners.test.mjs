import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectPartners,PARTNER_COLLECTION} from './partners.mjs';
import {createFeedService} from './feed.mjs';
const asset='https://cdn.prod.website-files.com/67837ee85ee175873126e461/image.webp';
const item={id:'partner1',lastPublished:'2026-10-16T10:00:00Z',isArchived:false,fieldData:{name:'Partner',slug:'partner',paragraph:'<p>Published copy</p>',image:{url:asset},logo:{url:asset},link:'https://example.com/',privateNotes:'Do not expose'}};
test('partner projection includes published details only and rejects unsafe URLs',()=>{
 const {partners}=projectPartners([item,{...item,id:'hidden',isArchived:true},{...item,id:'unpublished',lastPublished:null},{...item,id:'award',fieldData:{...item.fieldData,paragraph:null}}]);
 assert.equal(partners.length,1);assert.equal(partners[0].name,'Partner');assert.equal(partners[0].privateNotes,undefined);
 for(const link of ['javascript:alert(1)','https://user:pass@example.com/'])assert.throws(()=>projectPartners([{...item,fieldData:{...item.fieldData,link}}]));
});
test('partner route reads the fixed published collection and shares cached snapshots',async()=>{
 let calls=0;const feed=createFeedService({hostname:'test.example',fetcher:async url=>{calls++;assert.equal(url,`https://api.webflow.com/v2/collections/${PARTNER_COLLECTION}/items/live?limit=100&offset=0`);return Response.json({items:[item],pagination:{offset:0,total:1}})}});
 const request=new Request('https://test.example/tdb-content/v1/partners.json');
 const env={WEBFLOW_API_TOKEN:'test',CONTENT_FEEDS:{get:async()=>null,put:async()=>{}}};
 const response=await feed(request,env);assert.equal(response.status,200);const first=await response.json();assert.equal(first.feed,'partners');assert.equal(first.partners.length,1);
 await feed(request,env);assert.equal(calls,1);
});
