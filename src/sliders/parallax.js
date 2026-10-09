/* TDB Parallax v1.3.0.
 * Shared parallax preparation, CMS link state, native presentation and progress.
 * Bundled into the existing immediate runtime: no extra request or stylesheet.
 * Swiper and TDBMotion remain the shared slide/motion engines.
 */
(() => {
  'use strict';
  if (window.TDBParallax) return;
  const presentation = (() => {
  const roots = new Set();
  const portrait = matchMedia('(max-width:767px) and (orientation:portrait)');
  const landscape = matchMedia('(orientation:landscape)');
  const desktop = matchMedia('(min-width:992px)');
  const layoutSelector = '.tdb-service-content,.tdb-service-heading-row,.tdb-service-title,.tdb-service-copy,.tdb-service-link-source,.tdb-service-controls,.tdb-service-buttons,.tdb-service-cta';
  const owns = root => root?.classList.contains('tdb-service-parallax') || root?.hasAttribute('data-tdb-treatment');
  function layout(root) {
    if (root.hasAttribute('data-tdb-treatment')) return;
    const phone = landscape.matches && document.documentElement.classList.contains('tdb-phone-landscape');
    root.querySelectorAll(layoutSelector).forEach(node => node.classList.toggle('is-phone-landscape', phone));
    root.dataset.tdbServiceLayout = phone ? 'phone-landscape' : portrait.matches ? 'portrait' : desktop.matches ? 'desktop' : 'tablet';
  }
  function prepare(root) {
    if (!owns(root)) return;
    roots.add(root);
    layout(root);
    root.querySelectorAll('.tdb-service-controls,.tdb-service-cta,.tdb-treatment-controls,.tdb-treatment-cta').forEach(node => node.classList.add('is-ready'));
  }
  function setMoving(root, value) {
    if (owns(root)) root.querySelectorAll('[data-tdb-service-copy]').forEach(node => node.classList.toggle('is-moving', value));
  }
  function setEntry(root, value) {
    if (owns(root)) root.querySelectorAll('[data-tdb-service-copy]').forEach(node => node.classList.toggle('is-entry-pending', value));
  }
  function bind(root, swiper) {
    if (!owns(root)) return;
    const current = () => {
      const index = swiper.slides[swiper.activeIndex]?.getAttribute('data-swiper-slide-index');
      swiper.slides.forEach((slide, i) => slide.querySelector('.tdb-service-card,.tdb-treatment-blur')?.classList.toggle('is-current', index === null || index === undefined ? i === swiper.activeIndex : slide.getAttribute('data-swiper-slide-index') === index));
    };
    layout(root);
    current();
    swiper.on('slideChange loopFix resize update', current);
    swiper.on('beforeDestroy', () => {
      roots.delete(root);
      swiper.off('slideChange loopFix resize update', current);
      root.querySelectorAll('.tdb-service-controls,.tdb-service-cta,.tdb-treatment-controls,.tdb-treatment-cta').forEach(node => node.classList.remove('is-ready'));
    });
  }
  function resize() {
    roots.forEach(root => { if (root.isConnected) layout(root); else roots.delete(root); });
  }
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('orientationchange', resize);
  screen.orientation?.addEventListener('change', resize);
  portrait.addEventListener('change', resize);
  landscape.addEventListener('change', resize);
  desktop.addEventListener('change', resize);
  return {prepare, bind, setMoving, setEntry};
  })();

  // Existing treatment/technology card adapter; native service cards bypass it.
  const banners = (() => {
    const e = ".highlight-swiper_component:not([data-tdb-smile-slider]):not([data-tdb-ig-feed]):has(.layout423_card:not(.smile))", t = (e, t, n) => {
        const r = document.createElement(e);
        return r.className = t, void 0 !== n && (r.textContent = n), r;
    }, n = e => {
        const t = e?.getAttribute("href")?.trim();
        return t && "#" !== t && !/^javascript:/i.test(t) ? e : null;
    };
    function r(r) {
        if (r.hasAttribute('data-tdb-treatment') || r.classList.contains('tdb-service-parallax') || !r.matches(e)) return !1;
        const i = r.querySelector(":scope > .swiper"), a = i?.querySelector(":scope > .swiper-wrapper");
        if (!a || i.swiper) return !1;
        const o = [ ...a.children ].filter(e => e.matches(".swiper-slide:not(.swiper-slide-duplicate)")), s = o.map(e => {
            const t = e.querySelector(".layout423_card:not(.smile)"), r = t?.querySelector("h1,h2,h3,h4,.heading-style-h4"), i = t?.querySelector(".layout423_image");
            if (!t || !r || !i) return null;
            const a = n(t.querySelector(".layout423_card-content-bottom a[href]")) || n(t), o = a?.getAttribute("href")?.startsWith("/treatments/") ? "Discover treatment" : t.querySelector(".button")?.textContent.replace(/\s+/g, " ").trim() || "Learn more";
            return {
                title: r,
                image: i,
                link: a,
                label: o,
                paragraphs: [ ...t.querySelectorAll(".layout423_card-content-bottom p") ]
            };
        });
        if (!s.length || s.some(e => !e)) return !1;
        o.forEach((e, n) => {
            const r = s[n], i = t("div", "showcase_card"), a = t("div", "showcase-card_content text-color-alternate"), o = t("div", "max-width-xsmall service-card-mobile-copy");
            o.setAttribute("data-fade-slide", "true"), r.paragraphs.forEach(e => {
                o.append(t("p", "text-size-medium opacity-75", e.textContent.trim()));
            });
            const l = t("div", "showcase-content_btm"), d = t(r.title.tagName.toLowerCase(), "heading-style-h4 service-card-mobile-title", r.title.textContent.trim());
            d.setAttribute("data-fade-slide", "true");
            const c = t("div", "service-card-button-wrap");
            if (r.link) {
                const e = t("a", "button is-icon is-secondary w-inline-block");
                for (const t of [ "href", "target", "rel" ]) {
                    const n = r.link.getAttribute(t);
                    n && e.setAttribute(t, n);
                }
                e.append(t("div", "", r.label));
                const n = t("div", "icon-embed-xxsmall w-embed");
                n.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="m18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"/></svg>', 
                e.append(n), c.append(e);
            }
            l.append(d, c), a.append(o, l);
            const u = r.image.cloneNode(!0);
            u.className = "showcase_image", u.removeAttribute("style"), u.removeAttribute("id"), 
            u.setAttribute("data-swiper-parallax-x", "30%"), u.setAttribute("sizes", "140vw");
            const p = t("div", "image-overlay-layer is-showcase-card");
            i.append(a, u, p), e.classList.remove("is-3-grid"), e.classList.add("is-showcase"), 
            e.replaceChildren(i);
        }), a.classList.remove("is-3-grid");
        const l = r.querySelector(":scope > .swiper_functions-btm");
        return l?.classList.add("hide"), l?.querySelectorAll(".is-dark").forEach(e => e.classList.remove("is-dark")), 
        r.classList.remove("highlight-swiper_component"), r.classList.add("parallax-swiper_component", "tdb-banner-parallax", "tdb-entry-pending"), 
        r.setAttribute("data-tdb-banner-parallax", "1.0.0"), r.setAttribute("role", "region"), 
        r.setAttribute("aria-roledescription", "carousel"), r.setAttribute("aria-label", s.some(e => e.link?.getAttribute("href")?.startsWith("/treatments/")) ? "Treatments" : "Discover more"), 
        !0;
    }
    function i(t = document) {
        t instanceof Element && t.matches(e) && r(t), t.querySelectorAll?.(e).forEach(r);
    }
    return {refresh: i};
  })();

  const controls = (() => {
    const e = new WeakMap, t = window.location.pathname.replace(/\/+$/, "") || "/", n = "/" === t || "/location" === t;
    const eligible = root => n || root.classList.contains("tdb-service-parallax") || root.hasAttribute("data-tdb-banner-parallax");
    function r(r, i = r.querySelector(":scope > .swiper")) {
        if (!eligible(r) || !i) return null;
        if (e.has(r)) return e.get(r);
        const nativeLayout = r.hasAttribute('data-tdb-treatment') || r.classList.contains('tdb-service-parallax');
        !function(e) {
            if (!eligible(e)) return;
            const t = matchMedia("(max-width:767px) and (orientation:portrait)").matches;
            if (!nativeLayout) {
                document.documentElement.classList.toggle("tdb-slider-next", t);
                document.documentElement.classList.toggle("tdb-slider-desktop", matchMedia("(min-width:768px)").matches);
            }
            const r = e.querySelector(":scope > .swiper"), i = e.querySelector(":scope > .swiper_functions-btm.hide");
            !nativeLayout && t && r && i && !e.hasAttribute("data-tdb-banner-parallax") && r.appendChild(i), 
            e.querySelectorAll(".swiper-btn-prev,.swiper-btn-next").forEach(e => {
                e.tabIndex = 0, e.setAttribute("role", "button"), e.setAttribute("aria-label", e.matches(".swiper-btn-prev") ? "Previous slide" : "Next slide");
            });
        }(r);
        const a = function(r, i) {
            if (!eligible(r)) return null;
            const a = Array.from(i.querySelectorAll(":scope > .swiper-wrapper > .swiper-slide:not(.swiper-slide-duplicate)")), o = a.map(e => {
                const t = e.querySelector(".service-card-button-wrap a[href],.tdb-treatment-source a[href]");
                return t && {
                    href: t.getAttribute("href"),
                    target: t.getAttribute("target"),
                    rel: t.getAttribute("rel"),
                    label: t.textContent.replace(/\s+/g, " ").trim(),
                    title: e.querySelector(".service-card-mobile-title,.tdb-treatment-title")?.textContent.trim() || ""
                };
            }), s = i.querySelector(".service-card-button-wrap a[href],.tdb-treatment-source a[href]");
            if (!s) return null;
            const l = t + ":" + [ ...document.querySelectorAll(".parallax-swiper_component") ].indexOf(r), d = "back_forward" === performance.getEntriesByType?.("navigation")[0]?.type ? history.state?.tdbParallax?.[l] : null, c = d?.href ? Number.isInteger(d.index) && o[d.index]?.href === d.href ? d.index : o.findIndex(e => e?.href === d.href) : -1, u = c >= 0 ? c : 0, p = c >= 0;
            if (u) {
              i.style.setProperty("--tdb-parallax-initial-index", String(u));
              if (r.classList.contains('tdb-service-parallax')) i.querySelector(':scope > .swiper-wrapper')?.classList.add('tdb-parallax-initial-pose');
            }
            const nativeLayer = r.querySelector(':scope > .tdb-service-cta,:scope > .tdb-treatment-cta');
            const nativeButton = nativeLayer?.querySelector('[data-tdb-parallax-cta]');
            // Native components must never generate, replace or relocate their CTA.
            // A missing authored control is a markup issue, not a runtime layout job.
            if (nativeLayout && !nativeButton) return null;
            const b = nativeButton || s.cloneNode(!0);
            if (!nativeButton) {
            b.removeAttribute("aria-hidden"), b.removeAttribute("tabindex"), b.removeAttribute("data-fade-slide"), 
            b.classList.remove("fade", "animate"), b.setAttribute("data-tdb-parallax-cta", ""), 
            [ b, ...b.querySelectorAll("[id]") ].forEach(e => e.removeAttribute("id"));
            }
            p && d.held && b.classList.add("is-touch-held", "is-touch-input");
            const m = nativeLayer || document.createElement("div");
            if (!nativeLayer) m.className = "tdb-parallax-cta-layer";
            if (!nativeLayer) {
                "/location" === window.location.pathname.replace(/\/$/, "") && m.classList.add("is-location");
                m.appendChild(b);
            }
            const h = [];
            a.forEach((e, t) => {
                e.setAttribute("data-tdb-parallax-cta-index", String(t));
                if (!nativeLayout) e.querySelectorAll(".showcase-content_btm a.button").forEach(e => {
                    h.push({
                        node: e,
                        parent: e.parentNode,
                        next: e.nextSibling
                    }), e.remove();
                });
            });
            if (!nativeLayer) { r.classList.add("has-static-parallax-cta"); r.appendChild(m); }
            // Touch/wheel intent records its own scroll origin before D can be
            // set. An initial scroll read after preparing the DOM is redundant.
            let w = null, v = !1, f = !1, y = null, x = null, g = !1, A = null, L = !1, E = p && Boolean(d.held), B = !1, S = 0, D = !1;
            function T() {
                const e = history.state;
                if (null != e && ("object" != typeof e || Array.isArray(e))) return;
                const t = w?.slides[w.activeIndex], n = t ? Number(t.getAttribute("data-tdb-parallax-cta-index")) : u, r = o[n];
                if (r?.href) try {
                    history.replaceState({
                        ...e,
                        tdbParallax: {
                            ...e?.tdbParallax,
                            [l]: {
                                index: n,
                                href: r.href,
                                held: b.classList.contains("is-touch-held")
                            }
                        }
                    }, "");
                } catch (e) {}
            }
            function C() {
                b.classList.contains("is-touch-held") && (b.classList.remove("is-touch-held"), T());
            }
            function q() {
                D = !1, A = null, L = !1, B = !1;
            }
            function _() {
                T(), q();
            }
            function k() {
                v || "true" === b.getAttribute("aria-disabled") || (E = !0, b.classList.add("is-touch-input", "is-touch-held"));
            }
            function j(e) {
                const t = e.touches[0];
                A = t ? {
                    x: t.clientX,
                    y: t.clientY,
                    inComponent: r.contains(e.target)
                } : null, S = window.scrollY, D = !1, B = !1, A?.inComponent && (g = !0), b.contains(e.target) && k();
            }
            function P(e) {
                const t = e.touches[0];
                if (!A || !t) return;
                const n = Math.abs(t.clientX - A.x), r = Math.abs(t.clientY - A.y);
                Math.max(n, r) > 8 && A.inComponent && (B = !0, C()), r > 8 && r > n && (D = !0, 
                M());
            }
            function I(e) {
                e.deltaY && (S = window.scrollY, D = !0);
            }
            function M() {
                !D || Math.abs(window.scrollY - S) < 2 || (D = !1, C());
            }
            function N(e) {
                B = !1, r.contains(e.target) && (g = !0), L = b.contains(e.target) && !v && "true" !== b.getAttribute("aria-disabled"), 
                "touch" === e.pointerType || "pen" === e.pointerType ? L && k() : (E = !1, b.classList.remove("is-touch-input"), 
                C());
            }
            function R() {
                L = !1;
            }
            function Y() {
                L && C(), L = !1;
            }
            function O() {
                E = !1, b.classList.remove("is-touch-input"), C();
            }
            function z() {
                const e = w?.slides[w.activeIndex] || a[u], t = e?.getAttribute("data-tdb-parallax-cta-index"), n = null == t ? null : o[Number(t)];
                if (!nativeButton && r.hasAttribute("data-tdb-banner-parallax")) b.hidden = !n?.href;
                if (!n?.href) return b.removeAttribute("href"), 
                b.setAttribute("aria-disabled", "true"), void (b.tabIndex = -1);
                b.setAttribute("href", n.href);
                for (const e of [ "target", "rel" ]) n[e] ? b.setAttribute(e, n[e]) : b.removeAttribute(e);
                // The visible native label belongs to Designer. CMS source copy
                // may use different capitalization; it supplies the link only.
                if (!nativeButton && b.firstElementChild && b.firstElementChild.textContent !== n.label) b.firstElementChild.textContent = n.label;
                const label = nativeButton ? (b.firstElementChild?.textContent || b.textContent).trim() : n.label;
                b.setAttribute("aria-label", n.title ? `${label}: ${n.title}` : label), 
                v ? b.setAttribute("aria-disabled", "true") : b.removeAttribute("aria-disabled"), 
                b.tabIndex = v ? -1 : 0;
            }
            function F(e) {
                e.defaultPrevented || v || B || "true" === b.getAttribute("aria-disabled") ? (e.preventDefault(), 
                C()) : ((E || "touch" === e.pointerType || e.sourceCapabilities?.firesTouchEvents) && k(), 
                T());
            }
            function V() {
                y && !x && window.TDBSliderLoader && !f && (x = window.TDBSliderLoader.load(r).then(() => {
                    if (f || !r.isConnected) return;
                    if (window.TDBSwiper?.mount('parallax',r), !w) throw new Error("Parallax controls did not bind");
                    const e = y;
                    y = null, r.querySelectorAll(".swiper-btn-prev,.swiper-btn-next").forEach(t => {
                        t.classList.toggle("is-selected", t.matches("prev" === e ? ".swiper-btn-prev" : ".swiper-btn-next"));
                    }), "prev" === e ? w.slidePrev() : "next" === e && w.slideNext();
                }).catch(() => {
                    y = null;
                }).finally(() => {
                    x = null, r.removeAttribute("aria-busy");
                }));
            }
            function $(e) {
                const t = e.target.closest?.(".swiper-btn-prev,.swiper-btn-next");
                t && ("keydown" !== e.type || [ "Enter", " " ].includes(e.key)) && (C(), g = !0, 
                w || (e.preventDefault(), e.stopPropagation(), g = !0, y = t.matches(".swiper-btn-prev") ? "prev" : "next", 
                r.setAttribute("aria-busy", "true"), V()));
            }
            function W() {
                f = !0, e.delete(r), w?.off("slideChange", X), w?.off("sliderFirstMove", C), b.removeEventListener("click", F), b.removeEventListener('pointerenter', hover), b.removeEventListener('pointerleave', hover), 
                document.removeEventListener("pointerdown", N, !0), document.removeEventListener("pointerup", R, !0), 
                document.removeEventListener("touchstart", j, !0), document.removeEventListener("touchmove", P, !0), 
                document.removeEventListener("keydown", O, !0), b.removeEventListener("pointercancel", Y), 
                r.removeEventListener("click", $, !0), r.removeEventListener("keydown", $, !0), 
                window.removeEventListener("tdb:slider-loader-ready", V), window.removeEventListener("scroll", M), 
                window.removeEventListener("wheel", I), window.removeEventListener("pagehide", _), 
                window.removeEventListener("pageshow", q), !nativeLayer && (m.remove(), r.classList.remove("has-static-parallax-cta")), nativeLayer?.classList.remove('is-ready'), 
                i.style.removeProperty("--tdb-parallax-initial-index"), a.forEach(e => e.removeAttribute("data-tdb-parallax-cta-index")), 
                h.slice().reverse().forEach(({node: e, parent: t, next: n}) => {
                    t.insertBefore(e, n?.parentNode === t ? n : null);
                });
            }
            b.addEventListener("click", F), document.addEventListener("pointerdown", N, {
                capture: !0,
                passive: !0
            }), document.addEventListener("pointerup", R, {
                capture: !0,
                passive: !0
            }), document.addEventListener("touchstart", j, {
                capture: !0,
                passive: !0
            }), document.addEventListener("touchmove", P, {
                capture: !0,
                passive: !0
            }), document.addEventListener("keydown", O, !0), b.addEventListener("pointercancel", Y), 
            r.addEventListener("click", $, !0), r.addEventListener("keydown", $, !0), window.addEventListener("tdb:slider-loader-ready", V), 
            window.addEventListener("scroll", M, {
                passive: !0
            }), window.addEventListener("wheel", I, {
                passive: !0
            }), window.addEventListener("pagehide", _), window.addEventListener("pageshow", q), 
            z();
            // Native hover class avoids a sticky synthetic :hover on touch devices.
            function hover(event) {
              if (nativeButton && event.pointerType === 'mouse') b.classList.toggle('is-hovered', event.type === 'pointerenter' && b.getAttribute('aria-disabled') !== 'true');
            }
            if (nativeButton) { b.addEventListener('pointerenter', hover); b.addEventListener('pointerleave', hover); }
            let H = b.getAttribute("href") ? u : -1;
            function X() {
                const e = w?.slides[w.activeIndex], t = Number(e?.getAttribute("data-tdb-parallax-cta-index"));
                t !== H && C(), H = t, z();
            }
            return {
                initialIndex: u,
                get skipEntry() {
                    return p || g;
                },
                bind(e) {
                    w !== e && (w = e, i.querySelector(':scope > .swiper-wrapper')?.classList.remove('tdb-parallax-initial-pose'), w.on("slideChange", X), w.on("sliderFirstMove", C), w.on("beforeDestroy", W), 
                    z());
                },
                setBusy(e) {
                    v = e, z();
                }
            };
        }(r, i);
        if (a) {
          e.set(r, a);
          presentation.prepare(r);
        }
        return a;
    }
    return {prepare: r};
  })();

  // Samples rendered geometry so dragging, easing and loop copies share a clock.
  const progress = (() => {
  const nativeSelector='.tdb-service-parallax,[data-tdb-treatment]';
  const homeSelector='.section_gallery14 .parallax-swiper_component:not(.tdb-banner-parallax),#All-treatments .tdb-banner-parallax';
  // Track and marker appearance are native Webflow classes.
  const bindings=new WeakMap();
  function bind(component){
    const viewport=component.querySelector(':scope > .swiper'),wrapper=viewport?.querySelector(':scope > .swiper-wrapper');
    if(!wrapper)return false;
    const previous=bindings.get(component);
    if(previous?.wrapper===wrapper)return true;
    previous?.dispose();
    const nativeTrack=component.querySelector(':scope > [data-tdb-native-progress]');
    const nativeLayout=component.matches(nativeSelector);
    // Designer owns the track and both wrap markers. Never rebuild native UI.
    if(nativeLayout&&(!nativeTrack||nativeTrack.children.length<2))return false;
    if(!nativeTrack)component.querySelector(':scope > .tdb-service-progress')?.remove();
    const treatment=!!component.closest('#All-treatments');
    const track=nativeTrack||document.createElement('div'),fill=nativeTrack?.firstElementChild||document.createElement('span');
    if(!nativeTrack){track.className='tdb-service-progress';fill.className='tdb-service-progress-fill';}
    const wrapped=nativeTrack?.children[1]||fill.cloneNode();
    if(treatment&&!component.hasAttribute('data-tdb-treatment'))[fill,wrapped].forEach(node=>node.classList.add('is-treatment')); 
    track.setAttribute('aria-hidden','true');
    if(!nativeTrack){track.append(fill,wrapped);component.append(track);}
    let visible=false,disposed=false,lastTravel=null,lastSegment=null;
    let slides=[],count=0,structureDirty=true,layoutDirty=true,trackWidth=0,dpr=1;
    function readSlides(){
      slides=[...wrapper.children].filter(node=>node.classList.contains('swiper-slide')).map((node,i)=>{
        const index=node.getAttribute('data-swiper-slide-index')??String(i);
        return {node,index,value:Number(index)};
      });
      count=new Set(slides.map(slide=>slide.index)).size;
      structureDirty=false;
    }
    function paint(){
      const changed=structureDirty;
      if(changed)readSlides();
      if(!count){if(changed)track.classList.remove('is-ready');return null;}
      // Read all geometry before changing track/marker styles. Sizing shares
      // the rendered-progress frame, so resize/visibility callbacks coalesce.
      const box=viewport.getBoundingClientRect();
      const geometry=layoutDirty?measureLayout(box):null;
      const leftAligned=treatment&&(innerWidth<768||innerWidth>=992),center=box.left+(leftAligned?0:box.width/2);
      // Slides are laid out in DOM order. Binary-search their rendered centres
      // (or left edges) to sample the same two neighbours without reading every
      // offscreen loop copy. This preserves variable-width and interrupted motion.
      let leftX=-Infinity,rightX=Infinity,leftValue=0,rightValue=0;
      let low=0,high=slides.length;
      while(low<high){
        const mid=(low+high)>>>1,slide=slides[mid];
        const r=slide.node.getBoundingClientRect(),x=r.left+(leftAligned?0:r.width/2)-center;
        if(x<0){leftX=x;leftValue=slide.value;low=mid+1;}
        else{rightX=x;rightValue=slide.value;high=mid;}
      }
      const value=leftX===-Infinity?rightValue:rightX===Infinity?leftValue
        :leftValue+(rightValue-leftValue+count)%count*(-leftX/(rightX-leftX));
      const segment=Math.round(trackWidth*dpr/count)/dpr;
      const phase=((value%count)+count)%count;
      // Keep each settled position, with one extra segment-length step at the seam.
      const position=count<=1?0:phase<=count-1
        ? phase*(trackWidth-segment)/(count-1)
        : trackWidth-segment+(phase-count+1)*segment;
      const travel=Math.round(position*dpr)/dpr;
      if(geometry){
        track.style.top=geometry.top+'px';
        track.style.left=geometry.left+'px';
        track.style.width=trackWidth+'px';
      }
      if(changed)track.classList.add('is-ready');
      if(segment!==lastSegment){
        for(const marker of [fill,wrapped])marker.style.width=segment+'px';
        lastSegment=segment;
      }
      const pose=travel+':'+trackWidth;
      if(pose!==lastTravel){
        fill.style.transform=`translateX(${travel}px)`;
        wrapped.style.transform=`translateX(${travel-trackWidth}px)`;
        lastTravel=pose;
      }
    }
    const sampler=window.TDBRenderedProgress.observe({track:wrapper,paint,enabled:()=>visible&&!disposed,onMutation:records=>{
      for(const record of records){
        if(record.type==='childList'&&record.target===wrapper||
          record.target.parentElement===wrapper&&(record.attributeName==='data-swiper-slide-index'||
            record.attributeName==='class'&&record.target.classList.contains('swiper-slide')!==slides.some(slide=>slide.node===record.target))){
          structureDirty=true;break;
        }
      }
    }});
    function schedule(){sampler.schedule();}
    const visibility=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting);
      if(visible){layout();}
      else{sampler.pause();}
    },{rootMargin:'100px'});
    visibility.observe(viewport);
    function resume(){
      sampler.pause();
      if(!document.hidden){layout();}
    }
    document.addEventListener('visibilitychange',resume);
    function layout(){
      layoutDirty=true;
      schedule();
    }
    function measureLayout(box){
      layoutDirty=false;
      dpr=window.devicePixelRatio||1;
      // Preserve fractional geometry: offsetTop/offsetHeight round separately
      // and can leave a one-pixel gap between the image and its track.
      if(component.hasAttribute('data-tdb-treatment')) {
        // Designer owns the focused-card track geometry at every breakpoint.
        trackWidth=track.getBoundingClientRect().width;
        return null;
      }
      const parent=component.getBoundingClientRect();
      const top=box.bottom-parent.top-component.clientTop;
      // Snap inward to physical pixels so neither edge bleeds beyond the image.
      const left=Math.ceil((treatment?0:box.left)*dpr)/dpr;
      const right=Math.floor((treatment?document.documentElement.clientWidth:box.right)*dpr)/dpr;
      // These tracks have no border/padding or transform. Their authored width
      // is the rendered width; do not force layout just to read it back.
      trackWidth=Math.max(0,right-left);
      return {top,left:left-parent.left-component.clientLeft};
    }
    const resize=new ResizeObserver(layout);resize.observe(viewport);
    window.addEventListener('resize',layout,{passive:true});
    layout();
    bindings.set(component,{wrapper,dispose(){
      disposed=true;visibility.disconnect();resize.disconnect();sampler.destroy();
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('resize',layout);
      if(!nativeTrack)track.remove();else track.classList.remove('is-ready');
    }});
    // The authored starting marker remains visible until the first near-viewport
    // frame. Offscreen sliders need no geometry reads at startup.
    schedule();return true;
  }
  function refresh(root = document) {
    const selector=document.documentElement.dataset.wfPage === '677cf86df9952f978d94d8a9' ? nativeSelector+','+homeSelector : nativeSelector;
    if (root instanceof Element && root.matches(selector)) bind(root);
    root.querySelectorAll?.(selector).forEach(bind);
  }
  return {refresh};
  })();

  function refresh(root = document) {
    banners.refresh(root);
    if (root instanceof Element && root.matches('.parallax-swiper_component')) controls.prepare(root);
    root.querySelectorAll?.('.parallax-swiper_component').forEach(node => controls.prepare(node));
    progress.refresh(root);
  }
  window.TDBParallax = Object.freeze({
    version: '1.3.0', refresh, prepare: controls.prepare,
    bind: presentation.bind, setMoving: presentation.setMoving, setEntry: presentation.setEntry
  });
})();

