/* Published CMS projection. Webflow token stays in a Worker secret; read operations only. */
const SOURCE='https://api.webflow.com/v2/collections/';
const FIELDS=['slug','smile-release-time','smile-release-uk-time','next-signature-slot','next-signature-uk-time','smile-countdown-text','smile-waitlist-text','smile-booked-title','signature-heading','signature-availability-text'];
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
const error=(status,message)=>Response.json({error:message},{status,headers});
const COLLECTION='6aae66a4a90480deba7364b1';
const ITEMS={active:'6aae67a1e8b724b14bafae67',preview:'6aae68e7f97f052a1ef8eeac'};
const DATES=['smile-release-time','next-signature-slot'];
// Only our fixed codes and allowlisted field names may reach diagnostic logs.
class FeedError extends Error{
  constructor(code,field){super(code);this.code=code;this.field=field;}
}
// CMS date fields supply the calendar date; separate fields supply UK wall time.
export function project(item,channel){
  if(!Object.hasOwn(ITEMS,channel)||item?.id!==ITEMS[channel])throw new FeedError('cms_item_identity');
  if(item.isDraft!==false)throw new FeedError('cms_item_draft_status');
  if(item.isArchived!==false)throw new FeedError('cms_item_archive_status');
  if(!item.lastPublished)throw new FeedError('cms_item_not_published');
  if(item.fieldData?.slug!==channel)throw new FeedError('cms_item_slug');
  const fields=Object.create(null);
  for(const name of FIELDS){
    const raw=item.fieldData[name];
    if(raw!=null&&typeof raw!=='string')throw new FeedError('cms_field_type',name);
    let value=(raw??'').trim();
    if(value.length>2048)throw new FeedError('cms_field_too_large',name);
    if(DATES.includes(name)&&value){
      if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value.slice(0,10))throw new FeedError('cms_date_invalid',name);
      value=value.slice(0,10);
    }
    fields[name]=value;
  }
  for(const [date,clock] of [[DATES[0],'smile-release-uk-time'],[DATES[1],'next-signature-uk-time']]){
    if((fields[date]||fields[clock])&&(!fields[date]||!/^([01]\d|2[0-3]):[0-5]\d$/.test(fields[clock])))throw new FeedError('cms_date_incomplete',date);
  }
  return fields;
}
export async function handle(request,{fetcher=(...args)=>fetch(...args),cache=globalThis.caches?.default,now=Date.now,waitUntil=()=>{},token,report=()=>{}}={}){
  const url=new URL(request.url),match=url.pathname.match(/^\/(active|preview)\.json$/);
  if(!match)return error(404,'Not found');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'}});
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD, OPTIONS'}});
  const unavailable=(code,status,field)=>{
    const detail={event:'availability_feed_failure',channel:match[1],code};
    if(Number.isInteger(status)&&status>=100&&status<=599)detail.status=status;
    if(FIELDS.includes(field))detail.field=field;
    try{report(detail);}catch(_){} // Logging must not change the public response.
    return error(503,'Availability temporarily unavailable');
  };
  if(typeof token!=='string'||!token.trim())return unavailable('missing_token');
  const key=new Request(url.origin+url.pathname+'?source=cms-v1'),force=url.searchParams.get('refresh')==='1';
  const head=response=>request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
  if(cache&&!force){try{const hit=await cache.match(key);if(hit){hit.headers.set('Cache-Control','no-store');return head(hit);}}catch(_){}}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3000);
  let stage='cms_fetch_failed',status;
  try{
    // Fixed origin and fixed route: callers cannot choose an upstream or pass credentials.
    const upstream=await fetcher(SOURCE+COLLECTION+'/items/'+ITEMS[match[1]]+'/live',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
    status=upstream.status;
    if(!upstream.ok)return unavailable('cms_http_error',status);
    stage='cms_body_read_failed';
    const body=await upstream.text();
    if(body.length>262144)return unavailable('cms_response_too_large',status);
    stage='cms_invalid_json';
    const fields=project(JSON.parse(body),match[1]);
    stage='feed_response_failed';
    const response=Response.json({version:1,channel:match[1],checkedAt:now(),fields},{headers});
    if(cache){
      const stored=response.clone();stored.headers.set('Cache-Control','public, max-age=60');
      waitUntil(cache.put(key,stored).catch(()=>{}));
    }
    return head(response);
  }catch(cause){return unavailable(controller.signal.aborted?'cms_timeout':cause instanceof FeedError?cause.code:stage,status,cause instanceof FeedError?cause.field:undefined);}
  finally{clearTimeout(timeout);}
}
export default {fetch(request,env,ctx){return handle(request,{token:env.WEBFLOW_API_TOKEN,waitUntil:p=>ctx.waitUntil(p),report:detail=>console.error(JSON.stringify(detail))});}};
