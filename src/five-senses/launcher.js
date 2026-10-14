/* Definition-only. Consent releases the launcher; activation fetches the controller. */
function prepareFiveSensesLauncher() {
  'use strict';
  if (window.TDBFiveSensesLauncher) return;
  const selector='[data-tdb-senses-open]', lifecycle=new AbortController();
  let flight, disposed=false;
  function load() {
    if (!flight) flight=window.TDBModules.load(new URL('tdb-five-senses-loader.js',TDBRuntimeModuleRoot),{
      ready:()=>typeof window.TDBFiveSensesEntry?.open==='function'
    }).catch(error=>{flight=null;throw error;});
    return flight;
  }
  async function open(trigger) {
    if(disposed || trigger?.getAttribute('aria-busy')==='true')return;
    try {
      let ready=false;
      await window.TDBModules.withBusy(trigger,async()=>{await load();ready=true;},{
        signal:lifecycle.signal,onError(error){throw error;}
      });
      if(ready&&!disposed&&trigger.isConnected)window.TDBFiveSensesEntry.open(trigger);
    }catch(error){
      if(!disposed)console.warn('TDB Five Senses: please try opening again.',error);
    }
  }
  function activate(event) {
    if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const trigger=event.target.closest?.(selector);
    if(!trigger||trigger.matches(':disabled,[aria-disabled="true"]'))return;
    if(event.type==='click'&&event.button!==0)return;
    if(trigger.matches('a[download],a[target]:not([target="_self"])'))return;
    if(event.type==='keydown'){
      if(!['Enter',' '].includes(event.key)||trigger.tagName==='BUTTON'||
        (event.key==='Enter'&&trigger.matches('a[href]')))return;
      event.preventDefault();if(event.repeat)return;
    }else event.preventDefault();
    open(trigger);
  }
  function refresh(root=document) {
    for(const trigger of [...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)]){
      trigger.setAttribute('aria-haspopup','dialog');
      if(!trigger.matches('button,a[href]')){
        trigger.setAttribute('role','button');
        if(!trigger.hasAttribute('tabindex'))trigger.tabIndex=0;
      }
    }
  }
  document.addEventListener('click',activate,{signal:lifecycle.signal});
  document.addEventListener('keydown',activate,{signal:lifecycle.signal});
  window.TDBFiveSensesLauncher=Object.freeze({
    version:'1.0.0',open,refresh,
    destroy(){disposed=true;lifecycle.abort();window.TDBFiveSensesEntry?.destroy();}
  });
  refresh();
  // Existing shared URLs now arrive at the dedicated introduction.
  const url=new URL(location.href);
  if(url.pathname==='/'&&url.searchParams.get('five-senses')==='1'){
    url.pathname='/five-senses-experience';url.searchParams.delete('five-senses');
    location.replace(url.href);
  }
}
