// One-shot entry scheduling. Components retain their animation and fallback.
function firstView(root, {
  target = root, delay = () => window.TDBMotion.carousel.entryStart,
  frames = 2, threshold = 0, rootMargin = '0px', observe = true,
  armed = true, immediate = false, ready = () => true,
  inputs = ['pointerdown','touchstart','keydown','click','focusin'],
  enter, cancel: onCancel = () => {}, visibility = () => {}, signal,
} = {}) {
  let done = false, visible = !observe, frame = 0, timer = 0, observer;
  function pause() {
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
    frame = timer = 0;
  }
  function cleanup() {
    pause(); observer?.disconnect();
    inputs.forEach(event => root.removeEventListener(event, intent, true));
    document.removeEventListener('visibilitychange', changed);
    signal?.removeEventListener('abort', aborted);
  }
  function cancel(reason = 'interaction') {
    if (done) return;
    done = true; cleanup(); onCancel(reason);
  }
  function available() {
    if (done) return false;
    if (!root.isConnected || !target.isConnected) { cancel('detached'); return false; }
    return armed && visible && !document.hidden && ready();
  }
  function fire() {
    timer = 0;
    if (!available()) return;
    done = true; cleanup(); enter();
  }
  function afterFrames(remaining) {
    if (!available()) return;
    if (remaining > 0) {
      frame = requestAnimationFrame(() => { frame = 0; afterFrames(remaining - 1); });
    } else {
      const wait = typeof delay === 'function' ? delay() : delay;
      if (immediate && !wait) fire();
      else timer = setTimeout(fire, wait);
    }
  }
  function arm() {
    armed = true;
    if (!frame && !timer && available()) afterFrames(frames);
  }
  function changed() {
    visibility(visible && !document.hidden);
    if (document.hidden) pause(); else if (armed) arm();
  }
  const intent = () => cancel('interaction');
  const aborted = () => cancel('destroyed');
  const api = Object.freeze({arm, cancel, destroy() { if (!done) { done = true; cleanup(); } }, get pending() { return !done; }});
  inputs.forEach(event => root.addEventListener(event, intent, {capture:true,passive:true}));
  document.addEventListener('visibilitychange', changed);
  signal?.addEventListener('abort', aborted, {once:true});
  if (signal?.aborted) { aborted(); return api; }
  if (observe) {
    if (!('IntersectionObserver' in window)) { cancel('unsupported'); return api; }
    observer = new IntersectionObserver(entries => {
      if (done) return;
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0 && entry.intersectionRatio >= threshold);
      visibility(visible && !document.hidden);
      if (!visible) pause(); else if (armed) arm();
    }, {threshold, rootMargin});
    observer.observe(target);
  } else if (armed) arm();
  return api;
}
