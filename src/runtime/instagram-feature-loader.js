/* Definition-only. Native CMS Instagram enhancement follows the shared decision. */
function prepareInstagramFeatureLoader() {
  'use strict';
  if(window.TDBInstagramFeatureLoader)return;
  // Historical pages with an explicitly owned native build keep that controller.
  if(document.querySelector('script[data-tdb-instagram-native][src]'))return;
  const lifecycle=new AbortController();
  let flight, disposed=false, unsubscribe;
  const allowed=()=>!disposed&&Boolean(window.TDBConsent?.allows());
  function refresh(){
    if(!allowed())return;
    if(window.TDBInstagramNative){window.TDBInstagramNative.refresh();return;}
    if(flight||!document.querySelector('[data-tdb-ig-native]'))return;
    flight=Promise.resolve().then(()=> {
      if(!allowed())return;
      return window.TDBModules.load(new URL('tdb-instagram-native.min.js',TDBRuntimeModuleRoot),{
        ready:()=>Boolean(window.TDBInstagramNative),attribute:'data-tdb-instagram-feature'
      });
    }).then(()=>{
      if(disposed)window.TDBInstagramNative?.destroy?.();
      else if(allowed())window.TDBInstagramNative?.refresh();
    }).catch(error=>{if(!disposed)console.warn('TDB Instagram: retaining native posts.',error);})
      .finally(()=>{flight=null;});
    return flight;
  }
  window.TDBInstagramFeatureLoader=Object.freeze({version:'1.0.0',refresh,
    destroy(){if(disposed)return;disposed=true;lifecycle.abort();unsubscribe?.();window.TDBInstagramNative?.destroy?.();}
  });
  for(const event of ['online','pageshow'])window.addEventListener(event,refresh,{signal:lifecycle.signal});
  unsubscribe=window.TDBConsent?.subscribe(refresh);
  if(!unsubscribe)refresh();
}
