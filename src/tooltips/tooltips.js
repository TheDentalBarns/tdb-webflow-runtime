(() => {
    'use strict';
    if (window.TDBTooltips) { window.TDBTooltips.refresh(); return; }
    const iconWrapperClass = "tooltip2_element-wrapper";
    const tooltipWrapperClass = "tooltip2_tooltip-wrapper";
    const pointerClass = "tooltip2_pointer";
    //Code to reposition the tooltip if it is going to go outside the viewport. See https://github.com/relumetech/powerups/tree/main/tooltips for more info
        function f(t) {
        return t[0].toUpperCase() + t.slice(1);
    }
    function w(t) {
        return "padding" + f(t);
    }
    const y = {
        bottom: "top",
        left: "right",
        right: "left",
        top: "bottom"
    }, C = {
        bottom: {
            margin: [ 1, "auto", 0, "auto" ],
            inset: [ 0, 0, "auto", 0 ]
        },
        left: {
            margin: [ 0, 1, 0, 0 ],
            inset: [ "auto", 0, "auto", "auto" ]
        },
        right: {
            margin: [ 0, 0, 0, 1 ],
            inset: [ "auto", "auto", "auto", 0 ]
        },
        top: {
            margin: [ 0, "auto", 1, "auto" ],
            inset: [ "auto", 0, 0, 0 ]
        }
    };
    var t = {
        start: "left",
        end: "right",
        len: "width",
        translate: "translateX"
    }, e = {
        start: "top",
        end: "bottom",
        len: "height",
        translate: "translateY"
    };
    const b = {
        top: t,
        bottom: t,
        left: e,
        right: e
    };
    function n(s) {
        var e, n = "relumeTooltipSetup";
        if (!s.dataset[n]) {
            if (!s.parentElement?.querySelector('.' + tooltipWrapperClass) ||
                !s.parentElement.querySelector('.' + pointerClass)) return;
            s.dataset[n] = 1;
            const d = s.parentElement.querySelector("." + tooltipWrapperClass), m = s.parentElement.querySelector("." + pointerClass), g = m.className.includes("is-left") ? "left" : m.className.includes("is-right") ? "right" : m.className.includes("is-bottom") ? "bottom" : "top", u = y[g], c = (n = d, 
            n = window.getComputedStyle(n), parseInt(n.paddingTop, 10) || parseInt(n.paddingBottom, 10) || parseInt(n.paddingLeft, 10) || parseInt(n.paddingRight, 10) || 0);
            n = m, e = g, n = window.getComputedStyle(n), e = C[e].margin.indexOf(1);
            const h = [ n.marginTop, n.marginRight, n.marginBottom, n.marginLeft ][e];
            let t = !1, frame = 0;
            function p() {
                frame = 0;
                if (t && s.isConnected) {
                    frame = window.requestAnimationFrame(p);
                    var e = s.getBoundingClientRect(), n = d.getBoundingClientRect(), o = document.documentElement, a = b[g], i = (e[a.start] + e[a.end] - n[a.len]) / 2, r = (e[a.start] + e[a.end] + n[a.len]) / 2;
                    let t = 0;
                    var l = o["client" + f(a.len)], i = (i < 0 ? t = -i : l < r && (t = l - r), {
                        bottom: e.bottom + n.height < o.clientHeight,
                        left: 0 < e.left - n.width,
                        right: e.right + n.width < o.clientWidth,
                        top: 0 < e.top - n.height
                    }), l = i[g] || !i[u] ? g : u;
                    r = l, o = a, e = t, n = y[r], d.style[n] = "100%", d.style[r] = "auto", d.style[w(n)] = c + "px", 
                    d.style[w(r)] = "0", d.style.transform = o.translate + "(" + e + "px)", m.style.transform = o.translate + "(" + -e + "px) rotate(45deg)", 
                    m.style.margin = C[r].margin.map(t => 1 === t ? h : t).join(" "), m.style.inset = C[r].inset.join(" ");
                }
            }
            const parent = s.parentElement;
            function activate() {
                t = true;
                if (!frame) p();
            }
            function settle() {
                t = parent.matches(':hover') || parent.contains(document.activeElement);
                if (!t && frame) { cancelAnimationFrame(frame); frame = 0; }
                if (t && !frame) p();
            }
            parent.addEventListener('mouseenter', activate);
            parent.addEventListener('mouseleave', settle);
            parent.addEventListener('focusin', activate);
            parent.addEventListener('focusout', () => queueMicrotask(settle));
            // Loading can complete after the pointer/focus has already arrived.
            settle();
        }
    }
    function o(root = document) {
        if (root.matches?.('.' + iconWrapperClass)) n(root);
        root.querySelectorAll?.("." + iconWrapperClass).forEach(n);
    }
    function start() {
        o();
        new MutationObserver(records => records.forEach(record =>
            record.addedNodes.forEach(node => { if (node instanceof Element) o(node); })
        )).observe(document.body, { childList: true, subtree: true });
    }
    window.TDBTooltips = Object.freeze({ version: '1.0.0', refresh: () => o() });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
