/* TDB native Instagram v1.0.0. Webflow owns every visible node and style;
 * CMS owns posts; shared Gallery, Swiper, Motion and NativeTicker own behaviour. */
(() => {
  'use strict';
  if (window.TDBInstagramNative) return;
  const VERSION = '1.0.0';
  const BASE = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@41e1f34f7e17682bfd630554d1003170ef13dafd/dist/';
  const instances = new Map(), pending = new WeakSet();
  const numberFormat = new Intl.NumberFormat('en-GB');
  const dateFormat = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
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
    const source = [...document.querySelectorAll('[data-tdb-ig-source]')]
      .find(node => node.dataset.tdbIgSource === root.dataset.tdbIgNative);
    if (!source) return null;
    const seen = new Set();
    return [...source.querySelectorAll('[data-tdb-ig-record]')].flatMap(record => {
      const field = name => record.querySelector('[data-ig-field="'+name+'"]');
      const value = name => field(name)?.textContent.trim() || '';
      const image = record.querySelector('img');
      const url = field('url')?.getAttribute('href') || '';
      let parsed;
      try { parsed = new URL(url, location.href); } catch (_) { return []; }
      if (!['www.instagram.com','instagram.com'].includes(parsed.hostname) || !/^https?:$/.test(parsed.protocol) || seen.has(url) || !image?.getAttribute('src')) return [];
      seen.add(url);
      const metric = name => { const raw=value(name); const n=raw ? Number(raw.replace(/,/g,'')) : NaN; return hasMetric(n) ? n : null; };
      return [{url, image:image.getAttribute('src'), srcset:image.getAttribute('srcset') || '',
        alt:value('alt') || image.alt || 'The Dental Barns on Instagram', date:value('date'),
        id:value('id') || parsed.pathname, mediaType:value('media-type'),
        likes:metric('likes'), comments:metric('comments'), shares:metric('shares')}];
    });
  }
  function prepare(root, posts) {
    const track = root.querySelector('[data-ig-track]');
    const template = track?.querySelector('[data-ig-slide]');
    if (!template) throw Error('Instagram Designer card template missing');
    const first = Math.max(0, posts.length-1);
    const cards = posts.map((_, step) => {
      const index = (first+step)%posts.length, post=posts[index], slide=template.cloneNode(true);
      slide.classList.remove('is-current');
      slide.classList.add('swiper-slide');
      slide.dataset.igIndex=String(index);
      slide.setAttribute('role','group'); slide.setAttribute('aria-roledescription','slide');
      slide.setAttribute('aria-label',(index+1)+' of '+posts.length);
      slide.removeAttribute('id');
      slide.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      slide.querySelectorAll('img').forEach(image => {
        image.src=post.image;
        if(post.srcset) image.srcset=post.srcset; else image.removeAttribute('srcset');
        image.sizes='(max-width: 767px) 90vw, 50vw';
        image.alt=image.classList.contains('ig-native_photo') ? post.alt : '';
        image.loading='lazy'; image.decoding='async'; image.draggable=false;
      });
      return slide;
    });
    track.replaceChildren(...cards);
    root.querySelector('.ig-native_empty')?.classList.toggle('is-message-empty',!posts.length);
    root.querySelector('.ig-native_frame')?.classList.toggle('is-frame-empty',!posts.length);
    root.querySelector('.ig-native_controls')?.classList.toggle('is-single',posts.length<2);
    if (!posts.length) return null;
    track.classList.add('swiper-wrapper');
    root.querySelector('[data-ig-viewport]').classList.add('swiper');
    root.querySelector('[data-ig-prev]')?.classList.add('swiper-btn-prev');
    root.querySelector('[data-ig-next]')?.classList.add('swiper-btn-next');
    // Do not claim the shared gallery selector until CMS cards are ready.
    root.classList.add('highlight-swiper_component');
    return {first,track};
  }
  function mount(root, posts) {
    if (instances.has(root)) return instances.get(root);
    const prepared=prepare(root,posts);
    if (!prepared) { root.dataset.tdbIgReady=VERSION; return null; }
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
    let activePost=posts[prepared.first];
    function hideVideo(){ clearTimeout(timer);timer=0;symbol?.classList.remove('is-visible');video?.setAttribute('aria-hidden','true'); }
    function sync(){
      if(disposed)return;
      const index=((swiper?.realIndex||0)+prepared.first)%posts.length;
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
      const timestamp=Date.parse(activePost.date),known=Number.isFinite(timestamp);
      const text=known?dateFormat.format(timestamp):'';
      dateTicker.update(text,known&&previousDate!==null?(timestamp<previousDate?-1:1):direction,shown);
      date.setAttribute('aria-label',text);
      previousDate=known?timestamp:null;
      countTicker.update(pad(index+1),direction,!!swiper);
      label.textContent='Post '+(index+1)+' of '+posts.length;
      swiper?.slides.forEach(slide=>{
        const logical=Number(slide.dataset.igIndex);
        slide.classList.toggle('is-current',logical===index);
        const text=(logical+1)+' of '+posts.length;
        if(slide.getAttribute('aria-label')!==text)slide.setAttribute('aria-label',text);
      });
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
    root.addEventListener('click',share);root.addEventListener('keydown',key);
    sync();window.TDBGallery.beforeObserve(root);swiper=window.TDBSwiper.mount('gallery',root);
    if(!swiper)throw Error('Shared gallery unavailable');
    const handlers={slideChange:()=>{hideVideo();sync();},transitionStart:hideVideo,
      touchStart:()=>{dragging=true;clearTimeout(timer);timer=0;},sliderMove:hideVideo,
      touchEnd:()=>{dragging=false;reveal();},slidesLengthChange:sync,resize:spacing,beforeDestroy:()=>destroy(false)};
    Object.entries(handlers).forEach(([name,handler])=>swiper.on(name,handler));
    const stopSettled=window.TDBSwiper.onSettled(swiper,()=>{sync();reveal();});
    const observer=new MutationObserver(reveal);observer.observe(root,{attributes:true,attributeFilter:['data-tdb-slider-first-view']});
    const resize=new ResizeObserver(spacing);resize.observe(viewport);
    function destroy(destroySwiper=true){
      if(disposed)return;disposed=true;hideVideo();clearTimeout(noticeTimer);observer.disconnect();resize.disconnect();stopSettled();
      root.removeEventListener('click',share);root.removeEventListener('keydown',key);
      Object.entries(handlers).forEach(([name,handler])=>swiper.off(name,handler));
      dateTicker.destroy();countTicker.destroy();metrics.forEach(metric=>metric.roll?.destroy());instances.delete(root);
      if(destroySwiper&&!swiper.destroyed)swiper.destroy(true,true);
    }
    const api=Object.freeze({swiper,posts:posts.length,destroy});instances.set(root,api);
    spacing();sync();reveal();root.dataset.tdbIgReady=VERSION;root.removeAttribute('aria-busy');return api;
  }
  function refresh(scope=document){
    const roots=scope instanceof Element&&scope.matches('[data-tdb-ig-native]')?[scope]:[...scope.querySelectorAll('[data-tdb-ig-native]')];
    roots.forEach(root=>{
      if(instances.has(root)||pending.has(root)||root.dataset.tdbIgReady)return;
      const posts=readPosts(root);if(posts===null)return;
      pending.add(root);
      const start=()=>ready().then(()=>mount(root,posts)).catch(error=>{root.dataset.tdbIgError=error.message;pending.delete(root);});
      if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();start();}},{rootMargin:'400px'});observer.observe(root);}else start();
    });
    instances.forEach((instance,root)=>{if(!root.isConnected)instance.destroy();});
  }
  window.TDBInstagramNative=Object.freeze({version:VERSION,refresh,mount,readPosts,source:'webflow-cms'});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(),{once:true});else refresh();
})();
