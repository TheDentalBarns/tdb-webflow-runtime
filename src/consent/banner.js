/* Native TDB consent v4.0.1. Native markup/styles; shared lock; existing cookie/API/events. */
(() => {
    "use strict";
    if (window.CookieScript?.instance?.__tdbNative) return;
    const VERSION = "4.0.1", COOKIE_NAME = "CookieScriptConsent", COOKIE_DAYS = 30, ALL_CATEGORIES = [ "performance", "strict", "targeting", "functionality" ], STRICT_ONLY = [ "strict" ], ROOT_ID = "tdb-consent-root", TEXT_OPEN_DELAY_MS = 70, TEXT_CLOSE_MS = 420, CLOSE_TOTAL_MS = 470;
    let hasShown = false, open = false, closing = false, mounted = false, lastFocus = null, openFrame1 = 0, openFrame2 = 0, textOpenTimer = 0, closeTimer = 0, pendingAfterClose = null, interactionLocked = false, releaseLock = null, refs = null, textAnimations = [];
    function unique(values) {
        return [ ...new Set((values || []).filter(Boolean)) ];
    }
    function safeDecode(value) {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }
    function normaliseCategories(value, action) {
        let categories = value;
        if (typeof categories === "string") {
            try {
                categories = JSON.parse(categories);
            } catch {
                categories = categories.split(",");
            }
        }
        if (!Array.isArray(categories)) categories = [];
        categories = unique(categories.map(String));
        if (action === "accept" && categories.length === 0) categories = ALL_CATEGORIES.slice();
        if (!categories.includes("strict")) categories.push("strict");
        return categories;
    }
    function readDecision() {
        const row = document.cookie.split("; ").find(item => item.startsWith(`${COOKIE_NAME}=`));
        if (!row) return {
            action: undefined,
            categories: STRICT_ONLY.slice()
        };
        const raw = row.slice(COOKIE_NAME.length + 1);
        let data = null;
        for (const candidate of [ raw, safeDecode(raw) ]) {
            try {
                data = JSON.parse(candidate);
                break;
            } catch {}
        }
        if (!data || typeof data !== "object") return {
            action: undefined,
            categories: STRICT_ONLY.slice()
        };
        let action = data.action ?? data.a;
        if (action === "acceptall") action = "accept";
        if (![ "accept", "reject" ].includes(action)) action = undefined;
        const state = {
            action: action,
            categories: normaliseCategories(data.categories ?? data.c, action)
        };
        if (data.key) state.key = data.key;
        return state;
    }
    function writeDecision(action, categories) {
        const storedCategories = action === "accept" ? unique(categories.filter(category => category !== "strict")) : [], value = encodeURIComponent(JSON.stringify({
            action: action,
            categories: storedCategories,
            consenttime: Math.floor(Date.now() / 1e3)
        })), expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString(), secure = location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${COOKIE_NAME}=${value}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
    }
    function dispatch(name, detail) {
        document.dispatchEvent(new CustomEvent(name, {
            bubbles: true,
            cancelable: true,
            detail: detail
        }));
    }
    function pushConsentUpdate(categories) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: `CookieScriptConsentUpdated[${categories.join(",")}]`
        });
    }
    function dispatchState() {
        dispatch("CookieScriptCurrentState", api.currentState());
    }
    function dispatchCategories(categories) {
        categories.forEach(category => dispatch(`CookieScriptCategory-${category}`));
    }
    function activateWithKeyboard(element, callback) {
        element.addEventListener("click", callback);
        if (element.tagName === "BUTTON") return;
        element.addEventListener("keydown", event => {
            if (![ "Enter", " ", "Spacebar" ].includes(event.key)) return;
            event.preventDefault();
            callback();
        });
    }
    function cancelOpenFrames() {
        clearTimeout(textOpenTimer);
        textOpenTimer = 0;
        if (openFrame1) cancelAnimationFrame(openFrame1);
        if (openFrame2) cancelAnimationFrame(openFrame2);
        openFrame1 = openFrame2 = 0;
    }
    function clearTextAnimations() {
        textAnimations.forEach(animation => {
            try {
                animation.cancel();
            } catch {}
        });
        textAnimations = [];
        if (refs?.motion) refs.motion.getAnimations().forEach(animation => {
            try {
                animation.cancel();
            } catch {}
        });
    }
    function resetTextState() {
        if (!refs) return;
        clearTextAnimations();
        refs.motion.classList.remove("is-consent-text-open");
        refs.motion.style.removeProperty("opacity");
        refs.motion.style.removeProperty("transform");
    }
    function animateTextOut() {
        if (!refs) return;
        const {root: root, motion: motion} = refs, computed = getComputedStyle(motion), startTransform = computed.transform === "none" ? "translate3d(0,0,0)" : computed.transform, parsedOpacity = Number.parseFloat(computed.opacity), startOpacity = Number.isFinite(parsedOpacity) ? parsedOpacity : 1;
        motion.classList.remove("is-consent-text-open");
        clearTextAnimations();
        const animation = motion.animate([ {
            opacity: startOpacity,
            transform: startTransform,
            offset: 0
        }, {
            opacity: .5,
            transform: "translate3d(0,.2rem,0)",
            offset: .2
        }, {
            opacity: .15,
            transform: "translate3d(0,.45rem,0)",
            offset: .42
        }, {
            opacity: 0,
            transform: "translate3d(0,.75rem,0)",
            offset: .68
        }, {
            opacity: 0,
            transform: "translate3d(0,.95rem,0)",
            offset: 1
        } ], {
            duration: TEXT_CLOSE_MS,
            easing: "cubic-bezier(0,0,.2,1)",
            fill: "forwards"
        });
        textAnimations.push(animation);
    }
    function isEditable(target) {
        return target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"]'));
    }
    function blockScrollKeys(event) {
        if (!interactionLocked) return;
        if (event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
        if (event.key === " " && event.target instanceof Element && event.target.closest('button,a,[role="button"],input')) return;
        if ([ "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " " ].includes(event.key)) event.preventDefault();
    }
    function mount() {
        if (mounted && refs) return refs;
        const root = document.getElementById(ROOT_ID);
        if (!root) return null;
        const dialog = document.getElementById("tdb-consent-dialog"), motion = root.querySelector(".tdb-consent-motion"), accept = document.getElementById("cookiescript_accept"), reject = document.getElementById("cookiescript_reject");
        const backdrop = root.querySelector(".tdb-consent-backdrop"), surface = root.querySelector(".tdb-consent-surface"), scroll = root.querySelector(".tdb-consent-scroll");
        if (!dialog || !motion || !accept || !reject || !backdrop || !surface || !scroll) return null;
        refs = {
            root: root,
            dialog: dialog,
            motion: motion,
            accept: accept,
            reject: reject,
            backdrop: backdrop,
            surface: surface,
            scroll: scroll
        };
        if (!mounted) {
            activateWithKeyboard(accept, api.acceptAllAction);
            activateWithKeyboard(reject, api.rejectAllAction);
            dialog.addEventListener("keydown", event => {
                if (event.key !== "Tab") return;
                const controls = [ accept, reject ], index = controls.indexOf(document.activeElement);
                if (event.shiftKey && index <= 0) {
                    event.preventDefault();
                    reject.focus();
                } else if (!event.shiftKey && index === controls.length - 1) {
                    event.preventDefault();
                    accept.focus();
                }
            });
            document.addEventListener("keydown", blockScrollKeys, true);
            mounted = true;
        }
        return refs;
    }
    function show() {
        const found = mount();
        if (!found) return;
        const {root: root, dialog: dialog, surface: surface, backdrop: backdrop, motion: motion, scroll: scroll} = found;
        if (open && !closing && surface.classList.contains("is-consent-surface-open")) return;
        clearTimeout(closeTimer);
        closeTimer = 0;
        pendingAfterClose = null;
        cancelOpenFrames();
        // The shared lock reads page geometry; acquire before any banner writes.
        if (!releaseLock) releaseLock = window.TDBScrollLock.acquire({
            allow: [ scroll ]
        });
        if (hasShown) resetTextState();
        hasShown = true;
        if (!open) lastFocus = document.activeElement;
        open = true;
        closing = false;
        root.setAttribute("aria-hidden", "false");
        root.classList.add("is-consent-active");
        root.inert = false;
        dialog.style.removeProperty("pointer-events");
        surface.classList.remove("is-consent-surface-open");
        backdrop.classList.remove("is-consent-open");
        interactionLocked = true;
        openFrame1 = requestAnimationFrame(() => {
            openFrame1 = 0;
            if (!open || closing) return;
            openFrame2 = requestAnimationFrame(() => {
                openFrame2 = 0;
                if (!open || closing) return;
                dialog.focus({
                    preventScroll: true
                });
                surface.classList.add("is-consent-surface-open");
                backdrop.classList.add("is-consent-open");
                // Designer export omits transition-delay; preserve the original pause here.
                textOpenTimer = setTimeout(() => {
                    textOpenTimer = 0;
                    if (open && !closing) motion.classList.add("is-consent-text-open");
                }, TEXT_OPEN_DELAY_MS);
            });
        });
    }
    function finishHide() {
        if (!refs) return;
        const {root: root, motion: motion} = refs;
        clearTextAnimations();
        root.classList.remove("is-consent-active");
        refs.surface.classList.remove("is-consent-surface-open");
        refs.backdrop.classList.remove("is-consent-open");
        motion.classList.remove("is-consent-text-open");
        root.inert = true;
        motion.style.removeProperty("opacity");
        motion.style.removeProperty("transform");
        root.setAttribute("aria-hidden", "true");
        interactionLocked = false;
        if (releaseLock) {
            releaseLock();
            releaseLock = null;
        }
        open = false;
        closing = false;
        const afterClose = pendingAfterClose;
        pendingAfterClose = null;
        if (lastFocus instanceof HTMLElement && document.contains(lastFocus)) lastFocus.focus({
            preventScroll: true
        });
        if (typeof afterClose === "function") afterClose();
    }
    function hide(afterClose) {
        const found = mount();
        if (!found) {
            if (typeof afterClose === "function") afterClose();
            return;
        }
        const {root: root, surface: surface, backdrop: backdrop} = found;
        if (closing) return;
        cancelOpenFrames();
        clearTimeout(closeTimer);
        pendingAfterClose = typeof afterClose === "function" ? afterClose : null;
        if (!root.classList.contains("is-consent-active")) {
            finishHide();
            return;
        }
        closing = true;
        animateTextOut();
        refs.dialog.style.pointerEvents = "none";
        surface.classList.remove("is-consent-surface-open");
        backdrop.classList.remove("is-consent-open");
        closeTimer = setTimeout(finishHide, CLOSE_TOTAL_MS);
    }
    function acceptAll() {
        if (closing) return;
        writeDecision("accept", ALL_CATEGORIES);
        hide(() => {
            api.onAcceptAll();
            dispatch("CookieScriptAcceptAll");
            dispatchState();
            dispatchCategories(ALL_CATEGORIES);
            pushConsentUpdate(ALL_CATEGORIES);
        });
    }
    function rejectAll() {
        if (closing) return;
        writeDecision("reject", STRICT_ONLY);
        hide(() => {
            api.onReject();
            dispatch("CookieScriptReject");
            dispatchState();
            dispatchCategories(STRICT_ONLY);
            pushConsentUpdate(STRICT_ONLY);
        });
    }
    const api = {
        __tdbLite: true,
        __tdbNative: true,
        version: VERSION,
        onAcceptAll() {},
        onAccept() {},
        onReject() {},
        onClose() {},
        dispatchEventNames: [],
        currentState: readDecision,
        categories: () => ALL_CATEGORIES.slice(),
        expireDays: () => COOKIE_DAYS,
        hash: () => `tdb-cookie-consent-lite-${VERSION}`,
        show: show,
        showDetails: show,
        hide: () => hide(() => api.onClose()),
        acceptAllAction: acceptAll,
        rejectAllAction: rejectAll,
        acceptAction(categories) {
            if (Array.isArray(categories) && categories.includes("performance")) acceptAll(); else rejectAll();
        },
        applyCurrentCookiesState: dispatchState,
        forceDispatchCSLoadEvent() {
            dispatch("CookieScriptLoaded");
        },
        getCookieValueForQueryArg() {
            const row = document.cookie.split("; ").find(item => item.startsWith(`${COOKIE_NAME}=`));
            return row ? `${COOKIE_NAME}=${encodeURIComponent(row.slice(COOKIE_NAME.length + 1))}` : "";
        }
    };
    window.CookieScript = window.CookieScript || function CookieScript() {};
    window.CookieScript.instance = api;
    window.CookieScript.init = () => api;
    window.CookieScript.autoDisable = () => {};
    window.CookieScript.autoDisableStop = () => {};
    function boot() {
        const found = mount();
        const state = readDecision();
        if (!state.action) show();
        else if (found && !open) found.root.inert = true;
        dispatch("CookieScriptLoaded");
        dispatch("CookieScriptCurrentState", state);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {
        once: true
    }); else boot();
})();
