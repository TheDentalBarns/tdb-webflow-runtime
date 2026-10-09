/* TDB native Instagram v2.1.1. Webflow renders the visible CMS Collection List;
 * CMS owns posts; shared Gallery, Swiper, Motion and NativeTicker own behaviour. */
(() => {
  'use strict';
  if (window.TDBInstagramNative) return;
  // A late but successful download can resume control after the boot watchdog.
  if(document.querySelector('style[data-tdb-ig-loading]'))document.documentElement.setAttribute('data-tdb-ig-loading','');
  const VERSION = '2.1.1';
  const IMAGE_WINDOW = Object.freeze({desktop:5,mobile:3,desktopQuery:'(min-width:992px)'});
  const BASE = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@41e1f34f7e17682bfd630554d1003170ef13dafd/dist/';
  const instances = new Map(), pending = new WeakSet();
  const numberFormat = new Intl.NumberFormat('en-GB');
  const dateFormat = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  function postDate(value) {
    // Webflow prints a calendar date, not a timestamp. Parsing that as local
    // midnight and then formatting in UTC would shift dates in eastern zones.
    const calendar = /^([a-z]+)\s+(\d{1,2}),\s*(\d{4})$/i.exec(value);
    if (calendar) {
      const month = months.indexOf(calendar[1].toLowerCase());
      if (month !== -1) return Date.UTC(Number(calendar[3]),month,Number(calendar[2]));
    }
    return Date.parse(value);
  }
  const hasMetric = value => Number.isSafeInteger(value) && value >= 0;
  const pad = value => String(value).padStart(2, '0');
  let dependencies;
  function ready() {
    if (dependencies) return dependencies;
    dependencies = (async () => {
      if (!window.TDBModules) {
        await new Promise((resolve,reject) => {
          const existing = [...document.scripts].find(s => /\/tdb-modules\.js(?:\?|$)/.test(s.src));
          const node = existing || document.createElement('script');
          if (window.TDBModules) return resolve();
          node.addEventListener('load', resolve, {once:true});
          node.addEventListener('error', reject, {once:true});
          if (!existing) { node.src = BASE+'tdb-modules.js'; document.head.append(node); }
        });
      }
      const load = (name, check) => window.TDBModules.load(BASE+name, {ready:check});
      await load('tdb-motion.js', () => !!window.TDBMotion);
      await Promise.all([
        load('tdb-swiper-8.4.7.min.js', () => !!window.TDBSwiper?.create),
        load('tdb-ticker.js', () => !!window.TDBNativeTicker)
      ]);
      await load('tdb-gallery.js', () => !!window.TDBGallery);
    })().catch(error => { dependencies = null; throw error; });
    return dependencies;
  }
  function readPosts(root) {
    const collection = root.querySelector('[data-ig-cms]');
    if (!collection) return null;
    const track = collection.querySelector('[data-ig-track]');
    // Webflow omits the item list when only its native Empty State renders.
    if (!track) return collection.querySelector('.w-dyn-empty') ? [] : null;
    const seen = new Set();
    return [...track.children].filter(node => node.matches('[data-ig-slide]:not(.swiper-slide-duplicate)')).map(slide => {
      const record = slide;
      const field = name => record.querySelector('[data-ig-field="'+name+'"]');
      const value = name => field(name)?.textContent.trim() || '';
      const image = record.querySelector('.ig-native_photo');
      const source = image?.getAttribute('src') || image?.getAttribute('data-ig-src');
      const url = field('url')?.getAttribute('href') || '';
      let parsed;
      try { parsed = new URL(url, location.href); } catch (_) { throw Error('Instagram CMS item has an invalid post link'); }
      // Keep the authored list intact if a CMS item is incomplete. Silently
      // dropping it would make the card order and stationary details disagree.
      if (!['www.instagram.com','instagram.com'].includes(parsed.hostname) || !/^https?:$/.test(parsed.protocol) || seen.has(url) || !source) throw Error('Instagram CMS item needs a unique post link and image');
      seen.add(url);
      const metric = name => { const raw=value(name); const n=raw ? Number(raw.replace(/,/g,'')) : NaN; return hasMetric(n) ? n : null; };
      return {slide, url, date:value('date'), mediaType:value('media-type'),
        likes:metric('likes'), comments:metric('comments'), shares:metric('shares')};
    });
  }
  function fallback(root, posts) {
    const text = (selector, value) => {
      const slot = root.querySelector(selector);
      const node = slot?.querySelector('.ig-native_tick') || slot;
      if (node) node.textContent = value;
    };
    root.querySelector('.ig-native_empty')?.classList.toggle('is-message-empty',!posts.length);
    root.querySelector('.ig-native_frame')?.classList.toggle('is-frame-empty',!posts.length);
    root.querySelector('.ig-native_controls')?.classList.toggle('is-single',posts.length<2);
    posts.forEach((post,index)=>post.slide.classList.toggle('is-current',index===0));
    text('[data-ig-total]',pad(posts.length));
    text('[data-ig-current]',posts.length?'01':'');
    text('[data-ig-label]',posts.length?'Post 1 of '+posts.length:'');
    if (!posts.length) return;
    const post=posts[0], timestamp=postDate(post.date);
    text('[data-ig-date]',Number.isFinite(timestamp)?dateFormat.format(timestamp):'');
    root.querySelectorAll('[data-ig-post-link],[data-ig-action="likes"],[data-ig-action="comments"]').forEach(link=>link.href=post.url);
    ['likes','comments','shares'].forEach(key=>text('[data-ig-metric="'+key+'"]',hasMetric(post[key])?numberFormat.format(post[key]):''));
    const isVideo=/^video(?:\s|$)/i.test(post.mediaType);
    root.querySelector('.ig-native_video-symbol')?.classList.toggle('is-visible',isVideo);
    root.querySelector('.ig-native_video')?.setAttribute('aria-hidden',String(!isVideo));
  }
  function restoreImage(image) {
    // These runtime attributes are copied with Swiper loop slides. Designer's
    // original CMS binding remains the source of truth on every page render.
    for(const name of ['srcset','src']){
      const value=image.getAttribute('data-ig-'+name);
      if(value!==null){image.setAttribute(name,value);image.removeAttribute('data-ig-'+name);}
    }
  }
  function releaseImages(root) {
    root.setAttribute('data-ig-loading-fallback','');
    root.querySelectorAll('.ig-native_photo,.ig-native_reflection-photo').forEach(restoreImage);
  }
  function imageWindow(root, posts) {
    const desktop=matchMedia(IMAGE_WINDOW.desktopQuery), loaded=new Set();
    let current=0, previousCount=0;
    // Loop cloning can start requests even for display:none lazy images. Park
    // unfetched sources before Swiper clones them; restore only selected posts.
    posts.forEach(post=>post.slide.querySelectorAll('.ig-native_photo,.ig-native_reflection-photo').forEach(image=>{
      for(const name of ['srcset','src'])if(image.hasAttribute(name)){
        image.setAttribute('data-ig-'+name,image.getAttribute(name));image.removeAttribute(name);
      }
    }));
    function update(index=current, force=false) {
      const count=desktop.matches?IMAGE_WINDOW.desktop:IMAGE_WINDOW.mobile;
      if(!force&&index===current&&count===previousCount)return;
      current=index;previousCount=count;
      // Desktop focuses the left card: current + two visible cards + next/prev
      // buffers. Mobile shows one card with one neighbour in either direction.
      for(let offset=-1;offset<count-1;offset++)loaded.add((index+offset+posts.length)%posts.length);
      // Include Swiper loop copies, using the same CMS URL for photo/reflections.
      root.querySelectorAll('[data-ig-slide]:not([data-ig-image-ready])').forEach(slide=>{
        if(!loaded.has(Number(slide.dataset.igIndex)))return;
        slide.setAttribute('data-ig-image-ready','');
        slide.querySelectorAll('.ig-native_photo,.ig-native_reflection-photo').forEach(image=>{
          // Selected neighbours should fetch now, even beyond native lazy distance.
          if(image.loading!=='eager')image.loading='eager';
          restoreImage(image);
        });
      });
    }
    const resize=()=>update();
    desktop.addEventListener('change',resize);
    update();
    return {update,destroy(){desktop.removeEventListener('change',resize);}};
  }
  function prepare(root, posts) {
    const track = root.querySelector('[data-ig-track]');
    if (!track && posts.length) throw Error('Instagram CMS Collection List missing');
    const first = root.hasAttribute('data-tdb-slider-first-view') ? 0 : Math.max(0, posts.length-1);
    posts.forEach((post, index) => {
      const slide=post.slide;
      slide.classList.remove('is-current');
      slide.classList.add('swiper-slide');
      slide.dataset.igIndex=String(index);
      slide.setAttribute('role','group'); slide.setAttribute('aria-roledescription','slide');
      slide.setAttribute('aria-label',(index+1)+' of '+posts.length);
    });
    // Move the existing last CMS item ahead of the first for the shared
    // one-entry advance. No card/image construction or CMS source duplication.
    if (first>0) track.prepend(posts[first].slide);
    root.querySelector('.ig-native_empty')?.classList.toggle('is-message-empty',!posts.length);
    root.querySelector('.ig-native_frame')?.classList.toggle('is-frame-empty',!posts.length);
    root.querySelector('.ig-native_controls')?.classList.toggle('is-single',posts.length<2);
    if (!posts.length) return null;
    track.setAttribute('role','presentation');
    track.classList.add('swiper-wrapper');
    root.querySelector('[data-ig-viewport]').classList.add('swiper');
    root.querySelector('[data-ig-prev]')?.classList.add('swiper-btn-prev');
    root.querySelector('[data-ig-next]')?.classList.add('swiper-btn-next');
    // Do not claim the shared gallery selector until CMS cards are ready.
    root.classList.add('highlight-swiper_component');
    return {first,track};
  }
  function mount(root, posts=readPosts(root)) {
    if (instances.has(root)) return instances.get(root);
    if (posts===null) return null;
    const prepared=prepare(root,posts);
    if (!prepared) { root.dataset.tdbIgReady=VERSION; return null; }
    const images=imageWindow(root,posts);
    const viewport=root.querySelector('[data-ig-viewport]');
    const date=root.querySelector('[data-ig-date]');
    const counter=root.querySelector('[data-ig-current]');
    const total=root.querySelector('[data-ig-total]');
    const label=root.querySelector('[data-ig-label]');
    const video=root.querySelector('.ig-native_video');
    const symbol=root.querySelector('.ig-native_video-symbol');
    const tick=slot=>window.TDBNativeTicker.mount(slot,{template:root,valueClass:'ig-native_tick',incomingClass:'ig-native_tick'});
    const dateTicker=tick(date), countTicker=tick(counter);
    const metrics=['likes','comments','shares'].map(key=> {
      const slot=root.querySelector('[data-ig-metric="'+key+'"]');
      const node=root.querySelector('[data-ig-action="'+key+'"]');
      const known=posts.map(post=>post[key]).filter(hasMetric);
      slot?.classList.toggle('is-unavailable',!known.length);
      node?.classList.toggle('has-count',!!known.length);
      if(known.length) slot.style.setProperty('--ig-metric-width',Math.max(2,...known.map(n=>numberFormat.format(n).length))+'ch');
      return {key,slot,node,roll:slot?tick(slot):null,previous:null,
        label:key==='likes'?'View likes on Instagram':key==='comments'?'Comment on this post on Instagram':'Share this Instagram post'};
    });
    total.textContent=pad(posts.length);
    let swiper, shown=false, previousDate=null, dragging=false, timer=0, noticeTimer=0, disposed=false;
    let activePost=posts[prepared.first], previousPostIndex=-1;
    function hideVideo(){ clearTimeout(timer);timer=0;symbol?.classList.remove('is-visible');video?.setAttribute('aria-hidden','true'); }
    function sync(forceImages=false){
      if(disposed)return;
      const index=((swiper?.realIndex||0)+prepared.first)%posts.length;
      // The entrance starts on the last item and advances to post 1. Its image
      // is already the previous neighbour; do not fetch a second window for it.
      images.update(!swiper||root.getAttribute('data-tdb-slider-first-view')==='pending'?0:index,forceImages);
      if(index===previousPostIndex&&!forceImages)return;
      const changed=index!==previousPostIndex;
      previousPostIndex=index;
      swiper?.slides.forEach(slide=>{
        const logical=Number(slide.dataset.igIndex);
        slide.classList.toggle('is-current',logical===index);
        const text=(logical+1)+' of '+posts.length;
        if(slide.getAttribute('aria-label')!==text)slide.setAttribute('aria-label',text);
      });
      if(!changed)return;
      const direction=swiper&&swiper.activeIndex<swiper.previousIndex?-1:1;
      activePost=posts[index];
      root.querySelector('[data-ig-post-link]').href=activePost.url;
      metrics.forEach(metric=>{
        const n=activePost[metric.key],known=hasMetric(n);
        const sign=known&&hasMetric(metric.previous)?(n<metric.previous?-1:1):direction;
        metric.roll?.update(known?numberFormat.format(n):'',sign,shown);
        metric.previous=n;
        metric.node.setAttribute('aria-label',(known?n+' '+metric.key+'. ':'')+metric.label);
        if(metric.key==='shares')metric.node.dataset.shareUrl=activePost.url;
        else metric.node.href=activePost.url;
      });
      const timestamp=postDate(activePost.date),known=Number.isFinite(timestamp);
      const text=known?dateFormat.format(timestamp):'';
      dateTicker.update(text,known&&previousDate!==null?(timestamp<previousDate?-1:1):direction,shown);
      date.setAttribute('aria-label',text);
      previousDate=known?timestamp:null;
      countTicker.update(pad(index+1),direction,!!swiper);
      label.textContent='Post '+(index+1)+' of '+posts.length;
    }
    function reveal(){
      if(timer||disposed||!swiper||swiper.destroyed||swiper.animating||dragging||root.getAttribute('data-tdb-slider-first-view')==='pending')return;
      timer=setTimeout(()=>{
        timer=0;
        if(disposed||swiper.animating||dragging||!root.isConnected)return;
        sync();shown=true;date.classList.add('is-ready');
        metrics.forEach(metric=>metric.slot?.classList.add('is-metric-ready'));
        const isVideo=/^video(?:\s|$)/i.test(activePost.mediaType);
        symbol?.classList.toggle('is-visible',isVideo);video?.setAttribute('aria-hidden',String(!isVideo));
      },window.TDBMotion.defaults.entryDelay);
    }
    function spacing(){
      const slide=prepared.track.querySelector('[data-ig-slide]');if(!slide||!swiper)return;
      const value=slide.style.marginRight;slide.style.removeProperty('margin-right');
      const gap=parseFloat(getComputedStyle(slide).marginRight)||0;
      if(value)slide.style.marginRight=value;
      if(swiper.params.spaceBetween!==gap){swiper.params.spaceBetween=gap;swiper.originalParams.spaceBetween=gap;swiper.update();}
    }
    async function share(event){
      const button=event.target.closest('[data-ig-action="shares"]');if(!button||!root.contains(button))return;
      event.preventDefault();const notice=root.querySelector('.ig-native_notice');
      try{
        if(navigator.share&&matchMedia('(pointer:coarse)').matches)await navigator.share({title:'The Dental Barns on Instagram',url:activePost.url});
        else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(activePost.url);notice.textContent='Post link copied';clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.textContent='',2500);}
        else window.open(activePost.url,'_blank','noopener,noreferrer');
      }catch(error){if(error.name!=='AbortError'&&notice)notice.textContent='Use the Instagram icon to open and share this post.';}
    }
    // Webflow Link nodes used as buttons retain native icon children and keyboard access.
    const buttons=[...root.querySelectorAll('[data-ig-prev],[data-ig-next],[data-ig-action="shares"]')];
    function key(event){if((event.key===' '||event.key==='Enter')&&buttons.includes(event.target)){event.preventDefault();event.stopPropagation();event.target.click();}}
    buttons.forEach(button=>{button.setAttribute('role','button');button.tabIndex=0;button.removeAttribute('href');});
    root.querySelectorAll('a[href]').forEach(link=>{link.target='_blank';link.rel='noopener noreferrer';});
    // Capture button activation before Swiper's own a11y handler, otherwise
    // Enter/Space would both click the link and advance through its key handler.
    root.addEventListener('click',share);root.addEventListener('keydown',key,true);
    sync();window.TDBGallery.beforeObserve(root);swiper=window.TDBSwiper.mount('gallery',root);
    if(!swiper)throw Error('Shared gallery unavailable');
    const handlers={slideChange:()=>{hideVideo();sync();},transitionStart:hideVideo,
      touchStart:()=>{dragging=true;clearTimeout(timer);timer=0;},sliderMove:hideVideo,
      touchEnd:()=>{dragging=false;reveal();},slidesLengthChange:()=>sync(true),resize:spacing,beforeDestroy:()=>queueMicrotask(()=>destroy(false))};
    Object.entries(handlers).forEach(([name,handler])=>swiper.on(name,handler));
    const stopSettled=window.TDBSwiper.onSettled(swiper,()=>{sync();reveal();});
    const observer=new MutationObserver(reveal);observer.observe(root,{attributes:true,attributeFilter:['data-tdb-slider-first-view']});
    const resize=new ResizeObserver(spacing);resize.observe(viewport);
    function destroy(destroySwiper=true){
      if(disposed)return;disposed=true;hideVideo();clearTimeout(noticeTimer);observer.disconnect();resize.disconnect();stopSettled();images.destroy();
      releaseImages(root);
      root.removeEventListener('click',share);root.removeEventListener('keydown',key,true);
      Object.entries(handlers).forEach(([name,handler])=>swiper.off(name,handler));
      dateTicker.destroy();countTicker.destroy();metrics.forEach(metric=>metric.roll?.destroy());instances.delete(root);
      if(destroySwiper&&!swiper.destroyed)swiper.destroy(true,true);
      posts.forEach(post=>{
        prepared.track.append(post.slide);
        post.slide.classList.remove('swiper-slide');
        post.slide.setAttribute('role','listitem');
        post.slide.removeAttribute('aria-roledescription');post.slide.removeAttribute('aria-label');
        delete post.slide.dataset.igIndex;
      });
      prepared.track.classList.remove('swiper-wrapper');prepared.track.setAttribute('role','list');
      viewport.classList.remove('swiper');root.classList.remove('highlight-swiper_component');
      delete root.dataset.tdbIgReady;pending.delete(root);fallback(root,posts);
    }
    const api=Object.freeze({swiper,posts:posts.length,destroy});instances.set(root,api);
    spacing();sync(true);reveal();root.dataset.tdbIgReady=VERSION;root.removeAttribute('aria-busy');return api;
  }
  function refresh(scope=document){
    const roots=scope instanceof Element&&scope.matches('[data-tdb-ig-native]')?[scope]:[...scope.querySelectorAll('[data-tdb-ig-native]')];
    roots.forEach(root=>{
      if(instances.has(root)||pending.has(root)||root.dataset.tdbIgReady)return;
      let posts;
      try { posts=readPosts(root); } catch(error) { root.dataset.tdbIgError=error.message;releaseImages(root);return; }
      if(posts===null)return;
      fallback(root,posts);
      if(!posts.length){root.dataset.tdbIgReady=VERSION;return;}
      pending.add(root);
      const start=()=>{
        const recovery=setTimeout(()=>releaseImages(root),15000);
        return ready().then(()=>{
          if(root.isConnected){mount(root,posts);delete root.dataset.tdbIgError;}
        }).catch(error=>{root.dataset.tdbIgError=error.message;releaseImages(root);})
          .finally(()=>{clearTimeout(recovery);pending.delete(root);});
      };
      if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();start();}},{rootMargin:'400px'});observer.observe(root);}else start();
    });
    instances.forEach((instance,root)=>{if(!root.isConnected)instance.destroy();});
  }
  window.TDBInstagramNative=Object.freeze({version:VERSION,refresh,mount,readPosts,imageWindow:IMAGE_WINDOW,source:'visible-webflow-cms'});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(),{once:true});else refresh();
})();
