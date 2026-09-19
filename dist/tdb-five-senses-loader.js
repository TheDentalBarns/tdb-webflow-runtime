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
  if(['mobile','tablet'].includes(query.get('preview'))&&!query.has('embedded')&&query.get('five-senses')!=='1'){
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
html.tdb-senses-scroll-locked,html.tdb-senses-scroll-locked body{overflow:hidden!important}
dialog[data-tdb-senses-shell]{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;outline:none;--tdb-senses-gutter:3vw;color:var(--tdb-senses-cream,#f5f1e6)!important}
dialog[data-tdb-senses-shell]:not(.tdb-senses){background:#222!important}
dialog[data-tdb-senses-shell]::backdrop{background:#131210;opacity:1;transition:opacity 500ms ease!important}
dialog[data-tdb-senses-shell][data-senses-opening]::backdrop,dialog[data-tdb-senses-shell][data-senses-closing]::backdrop{opacity:0!important}
dialog[data-tdb-senses-shell][data-senses-handover] .tdb-senses-start{opacity:0;pointer-events:none}
dialog[data-tdb-senses-shell] .tdb-senses-loading-view{position:absolute;inset:0;z-index:30;display:grid;align-content:center;justify-items:center;gap:1rem;margin:0;background:#222;color:#f5f1e6}
dialog[data-tdb-senses-shell] .tdb-senses-loading-ring{position:relative;display:block;box-sizing:border-box;width:88px;height:88px;flex:none;border:0;border-radius:50%}
dialog[data-tdb-senses-shell] svg.tdb-senses-progress-ring{position:absolute;inset:0;display:block;width:100%;height:100%;opacity:1;animation:tdb-senses-shell-turn 1.3s linear infinite;overflow:visible;will-change:transform;transform-origin:50% 50%;backface-visibility:hidden}
dialog[data-tdb-senses-shell] .tdb-senses-start-forming{position:relative;border-color:transparent;background:transparent;box-shadow:none;transition:none}
dialog[data-tdb-senses-shell] .tdb-senses-start-forming svg.tdb-senses-progress-ring{inset:-1px;width:calc(100% + 2px);height:calc(100% + 2px)}
dialog[data-tdb-senses-shell] .tdb-senses-start-forming .tdb-senses-start-icon{opacity:0}
dialog[data-tdb-senses-shell] .tdb-senses-loading-anchor{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:16px;font:inherit}
dialog[data-tdb-senses-shell] .tdb-senses-loading-anchor .tdb-senses-loading-text{margin:0;font-size:11px;letter-spacing:.18em;white-space:nowrap}
@keyframes tdb-senses-shell-turn{from{transform:translateZ(0) rotate(0deg)}to{transform:translateZ(0) rotate(360deg)}}
@media(prefers-reduced-motion:reduce){dialog[data-tdb-senses-shell] svg.tdb-senses-progress-ring{animation:none}}
dialog[data-tdb-senses-shell] .tdb-senses-loading-text{color:#f5f1e6!important;font:inherit}
dialog[data-tdb-senses-shell] .tdb-senses-persistent-close{position:absolute;z-index:40;top:max(22px,env(safe-area-inset-top));right:var(--tdb-senses-gutter);display:grid;place-items:center;width:44px;height:44px;padding:7px;margin:0;border:0;border-radius:50%;background:transparent!important;color:#fff!important;cursor:pointer;-webkit-tap-highlight-color:transparent}
dialog[data-tdb-senses-shell] .tdb-senses-persistent-close svg{width:30px;height:30px;filter:drop-shadow(0 1px 5px #0008)}
dialog[data-tdb-senses-shell] .tdb-senses-persistent-close:focus:not(:focus-visible){outline:none}
dialog[data-tdb-senses-shell] .tdb-senses-persistent-close:focus-visible{outline:1px solid #fff;outline-offset:2px}
@media(max-width:600px){dialog[data-tdb-senses-shell]{--tdb-senses-gutter:5vw}dialog[data-tdb-senses-shell] .tdb-senses-persistent-close{top:max(17px,env(safe-area-inset-top))}}
.tdb-senses-page-audio{position:fixed;inset:auto 1rem 1rem auto;margin:0;z-index:10001;display:grid;place-items:center;box-sizing:border-box;width:4rem;height:4rem;padding:0;border:1px solid rgba(255,255,255,.25);border-radius:50%;background:rgba(100,100,100,.2);color:#fff;box-shadow:none;-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);cursor:pointer;-webkit-tap-highlight-color:transparent}
.tdb-senses-page-audio::backdrop{background:transparent;pointer-events:none}
.tdb-senses-page-audio svg{display:block;width:1.75rem;height:1.75rem}
.tdb-senses-page-audio:focus-visible{outline:2px solid #f5f1e6;outline-offset:4px}
`;
  document.head.append(shellStyle);
  let active=null,stylePromise=null,pageAudio=null,mediaHoldVersion=0;
  function stopPageAudio(){
    if(!pageAudio)return;
    pageAudio.releaseLayer?.();pageAudio.audio.stop();pageAudio.button.remove();pageAudio=null;
  }
  function keepPageAudio(audio){
    stopPageAudio();
    if(!audio?.ready||document.hidden){audio?.stop();return;}
    const button=document.createElement('button');button.type='button';button.className='tdb-senses-page-audio';
    const topLayer=typeof button.showPopover==='function';
    if(topLayer)button.setAttribute('popover','manual');
    const update=()=>{
      button.setAttribute('aria-label',audio.muted?'Unmute piano and birdsong':'Mute piano and birdsong');
      button.setAttribute('aria-pressed',String(audio.muted));button.dataset.audioState=audio.muted?'muted':'playing';
      button.innerHTML='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h5l7-6v20l-7-6H5Z"/>'+(audio.muted?'<path d="m22 12 8 8m0-8-8 8"/>':'<path d="M21 11q5 5 0 10M24 7q9 9 0 18"/>')+'</svg>';
    };
    button.addEventListener('click',()=>{
      if(audio.muted)audio.context?.resume().catch(()=>{});
      audio.setMuted(!audio.muted);update();
    });
    pageAudio={audio,button};update();document.body.append(button);
    // Keep one button and one click handler. A manual popover paints above the
    // calculator without inheriting its slide transform. Modal ancestry keeps
    // the same control interactive and included in the dialog's keyboard trap.
    const dialogs=new Set();
    const place=()=>{
      const vip=document.querySelector('dialog.tdbc-vip-overlay[open]');
      const host=vip?.querySelector('#tdb-vip-drawer')||vip||document.querySelector('dialog.tdbc-dialog[open]')||document.body;
      const focused=document.activeElement===button;
      if(button.parentNode!==host){
        if(topLayer&&button.matches(':popover-open'))button.hidePopover();
        host.append(button);
      }
      if(topLayer&&!button.matches(':popover-open'))button.showPopover();
      if(focused&&document.activeElement!==button)button.focus({preventScroll:true});
    };
    const stateObserver=new MutationObserver(place);
    const discover=()=>{
      document.querySelectorAll('dialog.tdbc-dialog,dialog.tdbc-vip-overlay').forEach(dialog=>{
        if(dialogs.has(dialog))return;dialogs.add(dialog);stateObserver.observe(dialog,{attributes:true,attributeFilter:['open']});
      });
      place();
    };
    const treeObserver=new MutationObserver(records=>{
      if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&(node.matches?.('dialog')||node.querySelector?.('dialog')))))discover();
    });
    treeObserver.observe(document.body,{childList:true,subtree:true});discover();
    pageAudio.releaseLayer=()=>{treeObserver.disconnect();stateObserver.disconnect();dialogs.clear();};
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
      button.animate([{opacity:0},{opacity:1}],{duration:600,easing:'ease-in-out'});
    }
  }
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
    const root=document.documentElement;
    const lenis=window.lenis;
    const ownsLenis=!!(lenis&&typeof lenis.stop==='function'&&typeof lenis.start==='function'&&!lenis.isStopped);
    if(ownsLenis)lenis.stop();
    // A separate lock never saves or restores a menu's transient overflow value.
    root.classList.add('tdb-senses-scroll-locked');
    let released=false;
    return()=>{
      if(released)return;
      released=true;
      root.classList.remove('tdb-senses-scroll-locked');
      if(ownsLenis&&window.lenis===lenis){lenis.start();lenis.resize?.();}
    };
  }
  // Borrow existing players; never create an iframe, load an SDK or request consent.
  function holdPageMedia(){
    let held=true;
    const version=++mediaHoldVersion;
    const entries=Array.from(document.querySelectorAll('[data-vimeo-player-init]')).map(root=>{
      const autoplay=root.getAttribute('data-vimeo-autoplay');
      const userPaused=root._heroState?.pausedByUser||root.getAttribute('data-vimeo-paused-by-user')==='true';
      // Preserve a requested start as well as established playback. Pausing an
      // already-paused loading player may emit no pause event, leaving its
      // controller busy until we explicitly resume that original request.
      const resume=!userPaused&&(root.getAttribute('data-vimeo-playing')==='true'||['playing','loading'].includes(root._heroState?.ui)||!!root._ambientState?.playing||!!root._ambientState?.busy||(autoplay==='true'&&!!root._vimeoPlayerPromise));
      const entry={root,autoplay,resume};
      root.setAttribute('data-vimeo-autoplay','false');
      const attach=player=>{
        if(!player)return;
        // Readiness can arrive after close: retain the player for the release
        // continuation without installing an obsolete pause guard on it.
        entry.player=player;
        if(!held)return;
        entry.pause=()=>{if(held)Promise.resolve(player.pause()).catch(()=>{});};
        player.on('play',entry.pause);
        return player.getPaused().catch(()=>null).then(paused=>{
          entry.resume=entry.resume||paused===false;
          if(held)return player.pause();
        }).catch(()=>{});
      };
      entry.pending=root._vimeoPlayer?Promise.resolve(attach(root._vimeoPlayer)):Promise.resolve(root._vimeoPlayerPromise).then(attach).catch(()=>{});
      return entry;
    });
    const videos=Array.from(document.querySelectorAll('video')).map(video=>{
      const entry={video,resume:!video.paused&&!video.ended};
      entry.pause=()=>{if(held)video.pause();};video.addEventListener('play',entry.pause);entry.pause();return entry;
    });
    return(resume=true)=>{
      if(!held)return;held=false;
      for(const entry of entries){
        const {root}=entry;
        if(root.getAttribute('data-vimeo-autoplay')==='false'){
          if(entry.autoplay===null)root.removeAttribute('data-vimeo-autoplay');else root.setAttribute('data-vimeo-autoplay',entry.autoplay);
        }
        if(entry.player&&entry.pause)entry.player.off('play',entry.pause);
        entry.pending.finally(()=>{
          const rect=root.getBoundingClientRect();
          if(resume&&version===mediaHoldVersion&&!active&&!document.hidden&&root.isConnected&&entry.resume&&!root._heroState?.pausedByUser&&root.getAttribute('data-vimeo-paused-by-user')!=='true'&&rect.width&&rect.height&&rect.bottom>0&&rect.top<innerHeight){
            Promise.resolve(entry.player?.play()).catch(()=>{});
          }
        });
      }
      for(const {video,resume:wasPlaying,pause} of videos){
        video.removeEventListener('play',pause);
        if(resume&&!active&&!document.hidden&&video.isConnected&&wasPlaying)Promise.resolve(video.play()).catch(()=>{});
      }
      // Re-evaluate the revealed page through the existing Vimeo controller.
      // Its resize handler applies consent, visibility and paused-by-user checks,
      // including autoplay players that had not been created when we opened.
      const refresh=()=>{if(resume&&version===mediaHoldVersion&&!active&&!document.hidden)window.dispatchEvent(new Event('resize'));};
      refresh();
      Promise.allSettled(entries.map(entry=>entry.pending)).then(refresh);
    };
  }
  function dispose(session,resumeMedia=true){
    if(active!==session)return;
    active=null;
    clearTimeout(session.closeTimer);
    session.handover?.forEach(motion=>motion.cancel());
    try{
      session.controller.abort();
    }finally{
      try{session.dialog.close();session.dialog.remove();}
      finally{session.restore();if(resumeMedia)window.TDBVIPDrawer?.close?.();session.releaseMedia(resumeMedia);}
    }
    if(session.calmAudio){if(resumeMedia)keepPageAudio(session.calmAudio);else session.calmAudio.stop();session.calmAudio=null;}
    if(session.opener?.isConnected)session.opener.focus({preventScroll:true});
    else{const target=document.querySelector('main,h1');if(target){const tab=target.getAttribute('tabindex');target.tabIndex=-1;target.focus({preventScroll:true});if(tab===null)target.removeAttribute('tabindex');else target.setAttribute('tabindex',tab);}}
  }
  function close(session){
    if(active!==session||session.closing)return;
    session.closing=true;
    // Dismiss the drawer through its own controller; leave navbar control alone.
    window.TDBVIPDrawer?.close?.();
    session.calmAudio=session.experience?.releaseAudio();
    session.dialog.inert=true;
    session.dialog.dataset.sensesClosing='';
    session.dialog.querySelectorAll('audio,video').forEach(media=>media.pause());
    // Keep the dialog, focus trap and page lock until its exit has finished.
    const motion=session.dialog.animate([
      {transform:'translate3d(0,0,0)',opacity:1},
      {transform:'translate3d(0,100%,0)',opacity:1}
    ],{duration:500,easing:'ease',fill:'forwards'});
    session.closeTimer=setTimeout(()=>dispose(session),600);
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
    cover.innerHTML=error?'<p class="tdb-senses-loading-text" role="alert">The experience could not load.<br>Please try again.</p><button class="tdb-senses-loading-retry" type="button">Try again</button>':'<div class="tdb-senses-loading-anchor"><span class="tdb-senses-loading-ring" aria-hidden="true"><svg class="tdb-senses-progress-ring" viewBox="0 0 88 88" fill="none"><circle cx="44" cy="44" r="43.5" stroke="currentColor" stroke-width="1" stroke-dasharray="68.33 273.32"/></svg></span><p class="tdb-senses-loading-text" role="status">A moment to arrive.</p></div>';
    session.loadingCover=cover;dialog.replaceChildren(session.closeControl,cover);
    if(error){cover.querySelector('button').addEventListener('click',()=>run(session),{once:true});cover.querySelector('button').focus();}
  }
  async function run(session){
    if(active!==session||session.closing)return;
    loading(session);
    session.dialog.dataset.sensesHandover='';
    try{
      // Paint and composite the spinner before module evaluation or scene work.
      await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      if(active!==session||session.closing||session.controller.signal.aborted)return;
      const [module]=await Promise.all([import(moduleURL),loadStyle()]);
      if(active!==session||session.closing||session.controller.signal.aborted)return;
      session.experience=await module.mountExperience({dialog:session.dialog,signal:session.controller.signal,assetBase,onClose:()=>close(session),loadingCover:session.loadingCover,closeControl:session.closeControl});
      if(active!==session||session.closing||session.controller.signal.aborted)return;
      const cover=session.loadingCover,anchor=cover.querySelector('.tdb-senses-loading-anchor');
      const start=session.dialog.querySelector('.tdb-senses-start');
      const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
      const duration=reduced?0:900,easing='cubic-bezier(.4,0,.2,1)';
      const circle=start.querySelector('.tdb-senses-circle'),icon=circle.querySelector('svg');
      const ring=anchor.querySelector('.tdb-senses-loading-ring'),progress=ring.querySelector('svg'),arc=progress.querySelector('circle');
      const label=start.querySelector('.tdb-senses-start-label'),loadingText=anchor.querySelector('p');
      const target=getComputedStyle(circle),background=target.backgroundColor,shadow=target.boxShadow;
      const spin=progress.getAnimations()[0],angle=Number(spin?.currentTime||0)%1300/1300*360;
      // The loading circle itself becomes the real Start button's circle.
      // Keep its current angle, then let the trailing end catch the leading end.
      progress.style.animation='none';progress.style.transform=`rotate(${angle}deg)`;
      ring.className='tdb-senses-circle tdb-senses-start-forming';
      icon.classList.add('tdb-senses-start-icon');ring.append(icon);circle.replaceWith(ring);
      loadingText.style.cssText='position:absolute;bottom:0;margin:0;font-size:11px;letter-spacing:.18em;white-space:nowrap';
      start.append(loadingText);anchor.remove();
      start.inert=true;start.style.opacity='1';start.style.zIndex='31';
      const animate=(element,frames,ms,delay=0)=>element.animate(frames,{duration:reduced?0:ms,delay:reduced?0:delay,easing,fill:'both'});
      const motions=[
        animate(cover,[{opacity:1},{opacity:0}],duration),
        progress.animate([{transform:`rotate(${angle}deg)`},{transform:`rotate(${angle+700/1300*360}deg)`}],{duration:reduced?0:700,easing:'linear',fill:'both'}),
        animate(arc,[{strokeDasharray:'68.33px 273.32px',strokeOpacity:1},{strokeDasharray:'273.32px 273.32px',strokeOpacity:.7}],700),
        animate(ring,[{backgroundColor:'transparent',boxShadow:'inset 0 0 28px 8px rgba(0,0,0,0)'},{backgroundColor:background,boxShadow:shadow}],650,250),
        animate(icon,[{opacity:0},{opacity:.88}],400,500),
        animate(loadingText,[{opacity:1},{opacity:0}],250),
        animate(label,[{opacity:0},{opacity:1}],350,550)
      ];
      session.handover=motions;
      await Promise.all(motions.map(motion=>motion.finished.catch(()=>{})));
      if(active!==session||session.closing||session.controller.signal.aborted)return;
      cover.remove();progress.remove();loadingText.remove();ring.classList.remove('tdb-senses-start-forming');delete session.dialog.dataset.sensesHandover;
      motions.forEach(motion=>motion.cancel());session.handover=null;
      start.style.removeProperty('opacity');start.style.removeProperty('z-index');start.inert=false;start.focus({preventScroll:true});
    }catch(error){
      if(active!==session||session.closing||session.controller.signal.aborted)return;
      loading(session,true);
    }
  }
  function open(opener,automatic=false){
    if(active)return;
    stopPageAudio();
    const dialog=document.createElement('dialog');dialog.dataset.tdbSensesShell='';
    const session={dialog,opener,controller:new AbortController(),restore:lockScroll(),releaseMedia:holdPageMedia()};
    active=session;document.body.append(dialog);loading(session);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close(session);});
    dialog.addEventListener('close',()=>dispose(session));
    dialog.dataset.sensesOpening='';
    dialog.showModal();
    document.documentElement.classList.remove('tdb-senses-boot');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(active===session&&!session.closing)delete dialog.dataset.sensesOpening;}));
    if(!automatic)dialog.animate([
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
  window.addEventListener('pagehide',()=>{stopPageAudio();if(active)dispose(active,false);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPageAudio();active?.calmAudio?.stop();}});
  window.TDBFiveSensesEntry=Object.freeze({version:'0.14.5'});
  // A direct experience link arrives on Home before any audio is unlocked.
  if(location.pathname==='/'&&query.get('five-senses')==='1'){
    const url=new URL(location.href);url.searchParams.delete('five-senses');history.replaceState(history.state,'',url);
    open(null,true);
  }
})();
