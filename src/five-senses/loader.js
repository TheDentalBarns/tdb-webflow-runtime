/* Page-only, demand-loaded TDB Five Senses entry. */
(() => {
  'use strict';
  const script=document.currentScript;
  if(!script||window.TDBFiveSensesEntry)return;
  const root=new URL('../',script.src);
  const moduleURL=new URL('dist/tdb-five-senses.js',root).href;
  const styleURL=new URL('dist/tdb-five-senses.css',root).href;
  const assetBase=JSON.parse(script.dataset.assets||'{}');
  for(const name of ['calm.mp3','clinical.mp3','scent-candle.webp','taste-clinical.webp','surgery-clinical-clean.webp'])if(!assetBase[name])assetBase[name]=new URL(`assets/five-senses/${name}`,root).href;
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
  const shellStyle=document.createElement('style');
  shellStyle.dataset.tdbSensesShell='';
  shellStyle.textContent=`
dialog[data-tdb-senses-shell]{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;outline:none;--tdb-senses-gutter:3vw;color:var(--tdb-senses-cream,#f5f1e6)!important}
dialog[data-tdb-senses-shell]:not(.tdb-senses){background:#222!important}
dialog[data-tdb-senses-shell]::backdrop{background:#131210;opacity:1;transition:opacity 500ms ease!important}
dialog[data-tdb-senses-shell][data-senses-opening]::backdrop,dialog[data-tdb-senses-shell][data-senses-closing]::backdrop{opacity:0!important}
dialog[data-tdb-senses-shell] .tdb-senses-loading-view{position:absolute;inset:0;z-index:30;display:grid;align-content:center;justify-items:center;gap:1rem;margin:0;background:#222;color:#f5f1e6}
dialog[data-tdb-senses-shell] .tdb-senses-loading-text{color:#f5f1e6!important;font:inherit}
dialog[data-tdb-senses-shell] .tdb-senses-persistent-close{position:absolute;z-index:40;top:max(22px,env(safe-area-inset-top));right:var(--tdb-senses-gutter);display:grid;place-items:center;width:44px;height:44px;padding:7px;margin:0;border:0;border-radius:50%;background:transparent!important;color:#fff!important;cursor:pointer;-webkit-tap-highlight-color:transparent}
dialog[data-tdb-senses-shell] .tdb-senses-persistent-close svg{width:30px;height:30px;filter:drop-shadow(0 1px 5px #0008)}
dialog[data-tdb-senses-shell] .tdb-senses-persistent-close:focus:not(:focus-visible){outline:none}
dialog[data-tdb-senses-shell] .tdb-senses-persistent-close:focus-visible{outline:1px solid #fff;outline-offset:2px}
@media(max-width:600px){dialog[data-tdb-senses-shell]{--tdb-senses-gutter:5vw}dialog[data-tdb-senses-shell] .tdb-senses-persistent-close{top:max(17px,env(safe-area-inset-top))}}
`;
  document.head.append(shellStyle);
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
  function dispose(session){
    if(active!==session)return;
    active=null;session.controller.abort();session.dialog.close();session.dialog.remove();session.restore();
    session.opener.focus({preventScroll:true});
  }
  function close(session){
    if(active!==session||session.closing)return;
    session.closing=true;
    session.dialog.dataset.sensesClosing='';
    session.dialog.querySelectorAll('audio,video').forEach(media=>media.pause());
    // Keep the dialog, focus trap and page lock until its exit has finished.
    const motion=session.dialog.animate([
      {transform:'translate3d(0,0,0)',opacity:1},
      {transform:'translate3d(0,100%,0)',opacity:1}
    ],{duration:500,easing:'ease',fill:'forwards'});
    motion.finished.catch(()=>{}).then(()=>dispose(session));
  }
  function loading(session,error=false){
    const {dialog}=session;
    dialog.className='tdb-senses-loading';dialog.setAttribute('aria-label','Loading the Five Senses experience');
    dialog.removeAttribute('aria-labelledby');dialog.removeAttribute('aria-describedby');
    if(!session.closeControl){
      const control=document.createElement('button');control.type='button';control.className='tdb-senses-loading-close tdb-senses-persistent-close';control.setAttribute('aria-label','Close experience');
      control.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1"><path d="m9 9 14 14M23 9 9 23"/></svg>';
      control.addEventListener('click',()=>close(session));session.closeControl=control;
    }
    const cover=document.createElement('div');cover.className='tdb-senses-loading-view';
    cover.innerHTML=error?'<p class="tdb-senses-loading-text" role="alert">The experience could not load.<br>Please try again.</p><button class="tdb-senses-loading-retry" type="button">Try again</button>':'<span class="tdb-senses-loading-ring" aria-hidden="true"></span><p class="tdb-senses-loading-text" role="status">A moment to arrive.</p>';
    session.loadingCover=cover;dialog.replaceChildren(session.closeControl,cover);
    if(error){cover.querySelector('button').addEventListener('click',()=>run(session),{once:true});cover.querySelector('button').focus();}
  }
  async function run(session){
    if(active!==session||session.closing)return;
    loading(session);
    try{
      const [module]=await Promise.all([import(moduleURL),loadStyle()]);
      if(active!==session||session.closing||session.controller.signal.aborted)return;
      await module.mountExperience({dialog:session.dialog,signal:session.controller.signal,assetBase,onClose:()=>close(session),loadingCover:session.loadingCover,closeControl:session.closeControl});
      if(active!==session||session.closing||session.controller.signal.aborted)return;
      const cover=session.loadingCover;
      await cover.animate([{opacity:1},{opacity:0}],{duration:350,easing:'ease',fill:'forwards'}).finished.catch(()=>{});
      cover.remove();
    }catch(error){
      if(active!==session||session.closing||session.controller.signal.aborted)return;
      loading(session,true);
    }
  }
  function open(opener){
    if(active)return;
    const dialog=document.createElement('dialog');dialog.dataset.tdbSensesShell='';
    const session={dialog,opener,controller:new AbortController(),restore:lockScroll()};
    active=session;document.body.append(dialog);loading(session);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close(session);});
    dialog.dataset.sensesOpening='';
    dialog.showModal();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(active===session&&!session.closing)delete dialog.dataset.sensesOpening;}));
    dialog.animate([
      {transform:'translate3d(0,20%,0)',opacity:0},
      {transform:'translate3d(0,0,0)',opacity:1}
    ],{duration:500,easing:'ease'});
    dialog.querySelector('button').focus();run(session);
  }
  document.querySelectorAll('[data-tdb-senses-open]').forEach(button=>{
    button.setAttribute('role','button');
    button.addEventListener('click',event=>{event.preventDefault();open(button);});
    if(button.tagName!=='BUTTON')button.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();open(button);}});
  });
  window.addEventListener('pagehide',()=>{if(active)dispose(active);});
  window.TDBFiveSensesEntry=Object.freeze({version:'0.13.1'});
})();
