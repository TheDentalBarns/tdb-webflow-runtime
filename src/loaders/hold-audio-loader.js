/* Prime only the controller near the cards. Audio stays behind a deliberate hold. */
function prepareHoldAudioLoader() {
  'use strict';
  const buttons = [...document.querySelectorAll('[data-tdb-hold-audio]')];
  if (window.TDBHoldAudioLoader || !buttons.length) return;
  const lifecycle = new AbortController(),
    options = { signal: lifecycle.signal };
  let flight,
    observer,
    held,
    context,
    disposed = false;
  function load() {
    if (!flight) {
      flight = window.TDBModules.load(new URL('tdb-hold-audio.js', TDBRuntimeModuleRoot).href, {
        ready: () => typeof window.TDBHoldAudio?.press === 'function',
      })
        .then(() => {
          observer?.disconnect();
        })
        .catch((error) => {
          flight = null;
          throw error;
        });
    }
    return flight;
  }
  function release(immediate = false) {
    const session = held;
    held = null;
    window.TDBHoldAudio?.release(immediate);
    if (!session) return;
    session.button.setAttribute('aria-pressed', 'false');
    session.button.removeAttribute('aria-busy');
    if (session.pointer != null && session.button.hasPointerCapture?.(session.pointer))
      session.button.releasePointerCapture(session.pointer);
  }
  function press(button, input) {
    if (disposed || held?.button === button || button.disabled) return;
    release();
    const session = { button, ...input };
    held = session;
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-busy', 'true');
    if (session.pointer != null) {
      try {
        button.setPointerCapture(session.pointer);
      } catch (_) {}
    }
    try {
      // Unlock synchronously even when a cold module download is still pending.
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context ||= new AudioContext();
      Promise.all([context.resume(), load()])
        .then(() => {
          if (!disposed && held === session && button.isConnected && !document.hidden)
            window.TDBHoldAudio.press(button, input, context);
        })
        .catch(() => {
          if (held !== session) return;
          release();
          button.title = 'Sound unavailable. Hold to try again.';
        });
    } catch (_) {
      release();
    }
  }
  for (const button of buttons) {
    button.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button === 0 && event.isPrimary !== false)
          press(button, { pointer: event.pointerId });
      },
      options,
    );
    button.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') return release();
        if (![' ', 'Enter'].includes(event.key)) return;
        event.preventDefault();
        if (!event.repeat) press(button, { key: event.key });
      },
      options,
    );
    button.addEventListener(
      'keyup',
      (event) => {
        if (held?.button === button && held.key === event.key) {
          event.preventDefault();
          release();
        }
      },
      options,
    );
    button.addEventListener(
      'blur',
      () => {
        if (held?.button === button) release();
      },
      options,
    );
    button.addEventListener(
      'lostpointercapture',
      (event) => {
        if (held?.button === button && held.pointer === event.pointerId) release();
      },
      options,
    );
    for (const type of ['click', 'contextmenu'])
      button.addEventListener(type, (event) => event.preventDefault(), options);
    button.addEventListener('focus', () => load().catch(() => {}), options);
  }
  for (const type of ['pointerup', 'pointercancel'])
    window.addEventListener(
      type,
      (event) => {
        if (held && held.pointer === event.pointerId) release();
      },
      options,
    );
  window.addEventListener('blur', () => release(), options);
  window.addEventListener('pagehide', () => release(true), options);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) release();
    },
    options,
  );
  if (window.IntersectionObserver) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) load().catch(() => {});
      },
      { rootMargin: '600px 0px' },
    );
    buttons.forEach((button) => observer.observe(button.closest('[data-tdb-audio-card]')));
  } else load().catch(() => {});
  window.TDBHoldAudioLoader = Object.freeze({
    destroy() {
      release(true);
      disposed = true;
      lifecycle.abort();
      observer?.disconnect();
      window.TDBHoldAudio?.destroy();
      if (context && context.state !== 'closed') context.close().catch(() => {});
    },
  });
}
