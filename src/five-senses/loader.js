/* Page-only, demand-loaded TDB Five Senses entry. */
(() => {
  'use strict';
  const script=document.currentScript;
  if(!script||window.TDBFiveSensesEntry)return;
  const root=new URL('../',script.src);
  const moduleURL=new URL('dist/tdb-five-senses.js',root).href;
  const styleURL=new URL('dist/tdb-five-senses.css',root).href;
  const assetBase=JSON.parse(script.dataset.assets||'{}');
  for(const name of ['calm.mp3','clinical.mp3','scent-candle.webp','taste-clinical.webp','surgery-clinical-clean.webp'])assetBase[name]=new URL(`assets/five-senses/${name}`,root).href;
  const query=new URLSearchParams(location.search);
  // Explicit review URLs provide real narrow iframe viewports, never normal entry UI.
  if(['mobile','tablet'].includes(query.get('preview'))&&!query.has('embedded')){
    const kind=query.get('preview'),width=kind==='mobile'?390:768,height=kind==='mobile'?844:1024;
    const url=new URL(location.href);url.searchParams.delete('preview');url.searchParams.set('embedded','1');
    const frame=document.createElement('iframe');frame.src=url.href;frame.title=`${kind} experience preview`;frame.width=String(width);frame.height=String(height);frame.allow='autoplay';
    const main=document.querySelector('[data-tdb-senses-entry]');
    if(main){main.className='tdb-senses-preview';main.replaceChildren();const label=document.createElement('p');label.textContent=`${width} × ${height} · ${kind} viewport`;main.append(label,frame);}
    return;
  }
  let active=null,stylePromise=null;
  function loadStyle(){
    if(stylePromise)return stylePromise;
    stylePromise=new Promise((resolve,reject)=>{
      const link=document.createElement('link');link.rel='stylesheet';link.href=styleURL;
      const timeout=setTimeout(()=>{link.remove();stylePromise=null;reject(new Error('The experience took too long to load.'));},20000);
      link.onload=()=>{clearTimeout(timeout);resolve();};
      link.onerror=()=>{clearTimeout(timeout);link.remove();stylePromise=null;reject(new Error('The experience could not load.'));};
      document.head.append(link);
    });
    return stylePromise;
  }
  function lockScroll(){
    const rootStyle=document.documentElement.style,bodyStyle=document.body.style;
    const oldRoot=rootStyle.overflow,oldBody=bodyStyle.overflow;
    const lenis=window.lenis;
    const ownsLenis=!!(lenis&&typeof lenis.stop==='function'&&typeof lenis.start==='function'&&!lenis.isStopped);
    if(ownsLenis)lenis.stop();
    rootStyle.overflow='hidden';bodyStyle.overflow='hidden';
    return()=>{rootStyle.overflow=oldRoot;bodyStyle.overflow=oldBody;if(ownsLenis&&window.lenis===lenis)lenis.start();};
  }
  function close(session){
    if(active!==session)return;
    active=null;session.controller.abort();session.dialog.close();session.dialog.remove();session.restore();
    session.opener.focus({preventScroll:true});
  }
  function loading(session){
    const {dialog}=session;
    dialog.className='tdb-senses-loading';dialog.setAttribute('aria-label','Loading the Five Senses experience');
    dialog.removeAttribute('aria-labelledby');dialog.removeAttribute('aria-describedby');
    dialog.innerHTML='<button class="tdb-senses-loading-close" type="button" aria-label="Close experience">×</button><div class="tdb-senses-loading-view"><span class="tdb-senses-loading-ring" aria-hidden="true"></span><p class="tdb-senses-loading-text" role="status">A moment to arrive.</p></div>';
    dialog.querySelector('button').addEventListener('click',()=>close(session),{once:true});
  }
  async function run(session){
    loading(session);
    try{
      const [module]=await Promise.all([import(moduleURL),loadStyle()]);
      if(active!==session||session.controller.signal.aborted)return;
      await module.mountExperience({dialog:session.dialog,signal:session.controller.signal,assetBase,onClose:()=>close(session)});
    }catch(error){
      if(active!==session||session.controller.signal.aborted)return;
      session.dialog.className='tdb-senses-loading';
      session.dialog.innerHTML='<button class="tdb-senses-loading-close" type="button" aria-label="Close experience">×</button><div class="tdb-senses-loading-view"><p class="tdb-senses-loading-text" role="alert">The experience could not load.<br>Please try again.</p><button class="tdb-senses-loading-retry" type="button">Try again</button></div>';
      session.dialog.querySelector('.tdb-senses-loading-close').addEventListener('click',()=>close(session),{once:true});
      session.dialog.querySelector('.tdb-senses-loading-retry').addEventListener('click',()=>run(session),{once:true});
      session.dialog.querySelector('.tdb-senses-loading-retry').focus();
    }
  }
  function open(opener){
    if(active)return;
    const dialog=document.createElement('dialog');
    const session={dialog,opener,controller:new AbortController(),restore:lockScroll()};
    active=session;document.body.append(dialog);loading(session);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close(session);});
    dialog.showModal();dialog.querySelector('button').focus();run(session);
  }
  document.querySelectorAll('[data-tdb-senses-open]').forEach(button=>{
    button.setAttribute('role','button');
    button.addEventListener('click',event=>{event.preventDefault();open(button);});
    if(button.tagName!=='BUTTON')button.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();open(button);}});
  });
  window.addEventListener('pagehide',()=>{if(active)close(active);});
  window.TDBFiveSensesEntry=Object.freeze({version:'0.10.0'});
})();
