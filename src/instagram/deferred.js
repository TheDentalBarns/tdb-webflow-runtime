/* Native CMS markup remains inert until permission and proximity release it.
 * Only the placeholder owns initial styling; the exact IG CSS loads on demand. */
(() => {
  'use strict';
  if(window.TDBInstagramDeferred)return;
  const base=new URL('./',document.currentScript.src);
  const records=new Map();
  let disposed=false;
  const allowed=()=>!disposed&&Boolean(window.TDBConsent?.allows());
  const cancelled=()=>new DOMException('Cancelled','AbortError');
  function check(holder,signal){if(!allowed()||signal.aborted||!holder.isConnected)throw cancelled();}
  function waitReady(root,signal){
    return new Promise((resolve,reject)=>{
      let observer,timer;
      const finish=error=>{observer?.disconnect();clearTimeout(timer);signal.removeEventListener('abort',abort);error?reject(error):resolve();};
      const abort=()=>finish(cancelled());
      const inspect=()=>{
        if(signal.aborted)return abort();
        if(root.dataset.tdbIgReady)return finish();
        if(root.dataset.tdbIgError)finish(Error(root.dataset.tdbIgError));
      };
      observer=new MutationObserver(inspect);
      observer.observe(root,{attributes:true,attributeFilter:['data-tdb-ig-ready','data-tdb-ig-error']});
      signal.addEventListener('abort',abort,{once:true});
      timer=setTimeout(()=>finish(Error('Instagram preparation timed out')),20000);
      inspect();
    });
  }
  function decode(image,signal){
    if(!image)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      let timer;
      const finish=error=>{clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);signal.removeEventListener('abort',abort);error?reject(error):resolve();};
      const abort=()=>finish(cancelled());
      const failed=()=>finish(Error('Instagram image could not load'));
      const loaded=()=>{
        if(image.decode)image.decode().then(()=>finish(),failed);else finish();
      };
      if(signal.aborted)return abort();
      signal.addEventListener('abort',abort,{once:true});
      timer=setTimeout(()=>finish(Error('Instagram image timed out')),15000);
      if(image.complete&&image.naturalWidth)loaded();
      else{image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});}
    });
  }
  function reset(holder,record){
    record.controller?.abort();record.root?.remove();record.root=null;
    holder.removeAttribute('aria-busy');holder.removeAttribute('data-ig-state');
    record.ready=false;
  }
  function prepare(holder){
    if(!allowed()||!holder?.isConnected)return Promise.resolve();
    let record=records.get(holder);
    if(!record){record={};records.set(holder,record);}
    if(record.ready||record.flight)return record.flight||Promise.resolve();
    if(record.retryAt>Date.now())return Promise.resolve();
    const controller=new AbortController(),signal=controller.signal;
    record.controller=controller;holder.setAttribute('aria-busy','true');
    record.flight=(async()=>{
      const key=holder.getAttribute('data-tdb-ig-placeholder');
      const template=[...document.querySelectorAll('template[data-tdb-ig-source]')].find(node=>node.getAttribute('data-tdb-ig-source')===key);
      const original=template?.content.querySelector('[data-tdb-ig-native]');
      if(!original)throw Error('Instagram CMS template missing');
      await Promise.all([
        window.TDBModules.load(new URL('tdb-instagram-native.css',base),{type:'style',attribute:'data-tdb-instagram-css'}),
        window.TDBModules.load(new URL('tdb-instagram-native.min.js',base),{ready:()=>Boolean(window.TDBInstagramNative),attribute:'data-tdb-instagram-feature'})
      ]);
      check(holder,signal);
      // Import into this document; leave the authored CMS source untouched for rollback.
      const root=document.importNode(original,true);record.root=root;
      [root,...root.querySelectorAll('[data-ig-class]')].forEach(node=>{
        const names=node.getAttribute('data-ig-class')?.split(/\s+/).filter(Boolean)||[];
        node.classList.add(...names);node.removeAttribute('data-ig-class');
      });
      // Park CMS photos before connecting the fragment. Native imageWindow then
      // releases its existing desktop 5/mobile 3 window, including reflections.
      root.querySelectorAll('.ig-native_photo,.ig-native_reflection-photo').forEach(image=>{
        for(const name of ['src','srcset'])if(image.hasAttribute(name)){
          image.setAttribute('data-ig-'+name,image.getAttribute(name));image.removeAttribute(name);
        }
      });
      holder.append(root);
      const mounted=waitReady(root,signal);
      window.TDBInstagramNative.refresh(root);
      await mounted;check(holder,signal);
      const first=root.querySelector('[data-ig-index="0"] .ig-native_photo');
      await decode(first,signal);check(holder,signal);
      holder.setAttribute('data-ig-state','ready');holder.removeAttribute('aria-busy');record.ready=true;
    })().catch(error=>{
      reset(holder,record);window.TDBInstagramNative?.refresh();
      if(error.name!=='AbortError'){
        record.retryAt=Date.now()+5000;holder.setAttribute('data-ig-state','error');
        console.warn('TDB Instagram: holding image retained.',error);
      }
    }).finally(()=>{record.flight=null;});
    return record.flight;
  }
  const unsubscribe=window.TDBConsent?.subscribe(()=>{
    if(allowed())return;
    records.forEach((record,holder)=>reset(holder,record));
  });
  window.TDBInstagramDeferred=Object.freeze({version:'1.0.0',prepare,
    destroy(){if(disposed)return;disposed=true;unsubscribe?.();records.forEach((record,holder)=>reset(holder,record));records.clear();}
  });
})();
