/* Published CMS projection. Webflow token stays in a Worker secret; read operations only. */
const SOURCE='https://api.webflow.com/v2/collections/';
const FIELDS=['slug','smile-release-time','smile-release-uk-time','next-signature-slot','next-signature-uk-time','smile-countdown-text','smile-waitlist-text','smile-booked-title','signature-heading','signature-availability-text'];
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
const error=(status,message)=>Response.json({error:message},{status,headers});
const COLLECTION='6aae66a4a90480deba7364b1';
const ITEMS={active:'6aae67a1e8b724b14bafae67',preview:'6aae68e7f97f052a1ef8eeac'};
const DATES=['smile-release-time','next-signature-slot'];
// CMS date fields supply the calendar date; separate fields supply UK wall time.
export function project(item,channel){
  if(!Object.hasOwn(ITEMS,channel)||item?.id!==ITEMS[channel]||item.isDraft!==false||item.isArchived!==false||!item.lastPublished||item.fieldData?.slug!==channel)throw Error('Invalid published item');
  const fields=Object.create(null);
  for(const name of FIELDS){
    const raw=item.fieldData[name];
    if(raw!=null&&typeof raw!=='string')throw Error('Invalid CMS field');
    let value=(raw??'').trim();
    if(value.length>2048)throw Error('Oversized CMS field');
    if(DATES.includes(name)&&value){
      if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value.slice(0,10))throw Error('Invalid CMS date');
      value=value.slice(0,10);
    }
    fields[name]=value;
  }
  for(const [date,clock] of [[DATES[0],'smile-release-uk-time'],[DATES[1],'next-signature-uk-time']]){
    if((fields[date]||fields[clock])&&(!fields[date]||!/^([01]\d|2[0-3]):[0-5]\d$/.test(fields[clock])))throw Error('Incomplete CMS date');
  }
  return fields;
}
export async function handle(request,{fetcher=(...args)=>fetch(...args),cache=globalThis.caches?.default,now=Date.now,waitUntil=()=>{},token}={}){
  const url=new URL(request.url),match=url.pathname.match(/^\/(active|preview)\.json$/);
  if(!match)return error(404,'Not found');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'}});
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD, OPTIONS'}});
  if(typeof token!=='string'||!token.trim())return error(503,'Availability temporarily unavailable');
  const key=new Request(url.origin+url.pathname+'?source=cms-v1'),force=url.searchParams.get('refresh')==='1';
  const head=response=>request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
  if(cache&&!force){try{const hit=await cache.match(key);if(hit){hit.headers.set('Cache-Control','no-store');return head(hit);}}catch(_){}}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3000);
  try{
    // Fixed origin and fixed route: callers cannot choose an upstream or pass credentials.
    const upstream=await fetcher(SOURCE+COLLECTION+'/items/'+ITEMS[match[1]]+'/live',{headers:{Authorization:'Bearer '+token,Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
    if(!upstream.ok)throw Error('CMS unavailable');
    const body=await upstream.text();
    if(body.length>262144)throw Error('Oversized CMS response');
    const fields=project(JSON.parse(body),match[1]);
    const response=Response.json({version:1,channel:match[1],checkedAt:now(),fields},{headers});
    if(cache){
      const stored=response.clone();stored.headers.set('Cache-Control','public, max-age=60');
      waitUntil(cache.put(key,stored).catch(()=>{}));
    }
    return head(response);
  }catch(_){return error(503,'Availability temporarily unavailable');}
  finally{clearTimeout(timeout);}
}
export default {fetch(request,env,ctx){return handle(request,{token:env.WEBFLOW_API_TOKEN,waitUntil:p=>ctx.waitUntil(p)});}};
