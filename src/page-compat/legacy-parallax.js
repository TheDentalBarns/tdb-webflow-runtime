/* Legacy card conversion, preserved for pages not yet rebuilt in Designer. */
window.TDBLegacyParallax ||= (() => {
        const e = ".highlight-swiper_component:not([data-tdb-smile-slider]):not([data-tdb-ig-feed]):has(.layout423_card:not(.smile))", t = (e, t, r) => {
            const n = document.createElement(e);
            return n.className = t, void 0 !== r && (n.textContent = r), n;
        }, r = e => {
            const t = e?.getAttribute("href")?.trim();
            return t && "#" !== t && !/^javascript:/i.test(t) ? e : null;
        };
        function n(n) {
            if (n.hasAttribute("data-tdb-treatment") || n.classList.contains("tdb-service-parallax") || !n.matches(e)) return !1;
            const i = n.querySelector(":scope > .swiper"), a = i?.querySelector(":scope > .swiper-wrapper");
            if (!a || i.swiper) return !1;
            const s = [ ...a.children ].filter(e => e.matches(".swiper-slide:not(.swiper-slide-duplicate)")), o = s.map(e => {
                const t = e.querySelector(".layout423_card:not(.smile)"), n = t?.querySelector("h1,h2,h3,h4,.heading-style-h4"), i = t?.querySelector(".layout423_image");
                if (!t || !n || !i) return null;
                const a = r(t.querySelector(".layout423_card-content-bottom a[href]")) || r(t), s = a?.getAttribute("href")?.startsWith("/treatments/") ? "Discover treatment" : t.querySelector(".button")?.textContent.replace(/\s+/g, " ").trim() || "Learn more";
                return {
                    title: n,
                    image: i,
                    link: a,
                    label: s,
                    paragraphs: [ ...t.querySelectorAll(".layout423_card-content-bottom p") ]
                };
            });
            if (!o.length || o.some(e => !e)) return !1;
            s.forEach((e, r) => {
                const n = o[r], i = t("div", "showcase_card"), a = t("div", "showcase-card_content text-color-alternate"), s = t("div", "max-width-xsmall service-card-mobile-copy");
                s.setAttribute("data-fade-slide", "true"), n.paragraphs.forEach(e => {
                    s.append(t("p", "text-size-medium opacity-75", e.textContent.trim()));
                });
                const d = t("div", "showcase-content_btm"), l = t(n.title.tagName.toLowerCase(), "heading-style-h4 service-card-mobile-title", n.title.textContent.trim());
                l.setAttribute("data-fade-slide", "true");
                const c = t("div", "service-card-button-wrap");
                if (n.link) {
                    const e = t("a", "button is-icon is-secondary w-inline-block");
                    for (const t of [ "href", "target", "rel" ]) {
                        const r = n.link.getAttribute(t);
                        r && e.setAttribute(t, r);
                    }
                    e.append(t("div", "", n.label));
                    const r = t("div", "icon-embed-xxsmall w-embed");
                    r.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="m18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"/></svg>', 
                    e.append(r), c.append(e);
                }
                d.append(l, c), a.append(s, d);
                const u = n.image.cloneNode(!0);
                u.className = "showcase_image", u.removeAttribute("style"), u.removeAttribute("id"), 
                u.setAttribute("data-swiper-parallax-x", "30%"), u.setAttribute("sizes", "140vw");
                const p = t("div", "image-overlay-layer is-showcase-card");
                i.append(a, u, p), e.classList.remove("is-3-grid"), e.classList.add("is-showcase"), 
                e.replaceChildren(i);
            }), a.classList.remove("is-3-grid");
            const d = n.querySelector(":scope > .swiper_functions-btm");
            return d?.classList.add("hide"), d?.querySelectorAll(".is-dark").forEach(e => e.classList.remove("is-dark")), 
            n.classList.remove("highlight-swiper_component"), n.classList.add("parallax-swiper_component", "tdb-banner-parallax", "tdb-entry-pending"), 
            n.setAttribute("data-tdb-banner-parallax", "1.0.0"), n.setAttribute("role", "region"), 
            n.setAttribute("aria-roledescription", "carousel"), n.setAttribute("aria-label", o.some(e => e.link?.getAttribute("href")?.startsWith("/treatments/")) ? "Treatments" : "Discover more"), 
            !0;
        }
        return {
            refresh: function(t = document) {
                t instanceof Element && t.matches(e) && n(t), t.querySelectorAll?.(e).forEach(n);
            }
        };
    })();
