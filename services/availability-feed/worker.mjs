/* Public CMS projection. No Dentally/Webflow API credentials or write operations. */
const SOURCE='https://dentalbarns.webflow.io';
const FIELDS=['slug','smile-release-time','smile-release-uk-time','next-signature-slot','next-signature-uk-time','smile-countdown-text','smile-waitlist-text','smile-booked-title','signature-heading','signature-availability-text'];
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
const error=(status,message)=>Response.json({error:message},{status,headers});
// Webflow escapes text nodes with these entities; arbitrary markup is never returned.
function decode(value){
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'};
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(entity,key)=>{
    if(key[0]!=='#')return named[key.toLowerCase()];
    const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
    return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'\ufffd';
  }).trim();
}
export function extract(html,channel){
  if(html.length>262144)throw Error('Oversized CMS response');
  // Exclude executable/raw text contexts before matching the public field divs.
  html=html.replace(/<!--[^]*?-->|<(script|style|textarea|title)\b[^>]*>[^]*?<\/\1\s*>/gi,'');
  const fields=Object.create(null);
  for(const match of html.matchAll(/<div\b[^>]*\bdata-banner-field="([^"]+)"[^>]*>([^<]*)<\/div>/g)){
    const name=match[1];if(!FIELDS.includes(name))continue;
    if(Object.hasOwn(fields,name))throw Error('Duplicate CMS field');
    const value=decode(match[2]);if(value.length>2048)throw Error('Oversized CMS field');fields[name]=value;
  }
  if(FIELDS.some(name=>!Object.hasOwn(fields,name))||fields.slug!==channel)throw Error('Incomplete CMS response');
  return fields;
}
export async function handle(request,{fetcher=(...args)=>fetch(...args),cache=globalThis.caches?.default,now=Date.now,waitUntil=()=>{}}={}){
  const url=new URL(request.url),match=url.pathname.match(/^\/(active|preview)\.json$/);
  if(!match)return error(404,'Not found');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'}});
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD, OPTIONS'}});
  const key=new Request(url.origin+url.pathname),force=url.searchParams.get('refresh')==='1';
  const head=response=>request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
  if(cache&&!force){try{const hit=await cache.match(key);if(hit)return head(hit);}catch(_){}}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3000);
  try{
    // Fixed origin and fixed route: callers cannot choose an upstream or pass credentials.
    const upstream=await fetcher(SOURCE+'/banner-settings/'+match[1],{credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
    if(!upstream.ok)throw Error('CMS unavailable');
    const fields=extract(await upstream.text(),match[1]);
    const response=Response.json({version:1,channel:match[1],checkedAt:now(),fields},{headers});
    if(cache){
      const stored=response.clone();stored.headers.set('Cache-Control','public, max-age=60');
      waitUntil(cache.put(key,stored).catch(()=>{}));
    }
    return head(response);
  }catch(_){return error(503,'Availability temporarily unavailable');}
  finally{clearTimeout(timeout);}
}
export default {fetch(request,_env,ctx){return handle(request,{waitUntil:p=>ctx.waitUntil(p)});}};
