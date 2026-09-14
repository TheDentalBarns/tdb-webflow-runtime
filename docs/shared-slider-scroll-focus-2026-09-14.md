# Shared slider scroll focus and marquee exclusion

The previous focus loader treated logo marquees as sliders. This requested the full slider bundle near Home's first partner strip even though its real sliders were farther down. Slider focus also maintained its own scroll listener and 120px/140px counters independently of the navbar.

This release excludes `.logo-slider` and its descendants from proximity, pointer and keyboard focus triggers, including generic nested `.swiper` markup. Custom motion sliders retain their existing 800px demand loader; the additional 100px observer now covers only native or standalone sliders. One immutable slider URL still deduplicates concurrent requests.

`TDBNavScroll.focus()` now holds the existing shared CSS state and uses the navbar's scroll counters to release it. The slider module handles deliberate input, menu geometry and focus cleanup; it has no scroll listener or duplicate distance thresholds. Existing nav, VIP and Elfsight CSS easing is unchanged. The navbar source is now in `src/navbar/navbar.js` with a reproducible minified build, replacing the previously unminified dist file.

Actual Home and Location parallax sliders, treatment/smile sliders and native sliders retain focus behavior. This prevents the marquee from requesting slider JS during the initial Home load; it intentionally allows real sliders to request it when approached or used. No slide-motion, autoplay, image-parallax, tooltip, head-CSS or production changes.

Validation: 16 automated checks passed, covering marquee exclusion before and after loading, native first-click preservation, all real slider families, desktop/mobile scroll thresholds, rapid input resets, horizontal drags, gallery takeover, keyboard/Escape, tooltip behavior and stylesheet recovery. Live staging publication and request/interaction checks are recorded in the release evidence.

Rollback: restore the exact prior global footer and publish only the Webflow subdomain. Prior branch head: `3c73d66135f34645757cba6ef8f0eab03f841a20`. Prior navbar pin: `0c4f2c8abd91eaf491ae41abebcc71c6e8cd0370`. Prior bootstrap pin: `3c73d66135f34645757cba6ef8f0eab03f841a20`. Prior footer runtime pin: `271f7b23e45aa4fde7b2a81248690de281cb6d87`. Prior slider pin: `1767ffc25f44bf507dd4d9c1a8ecacbdce00f26f`.
