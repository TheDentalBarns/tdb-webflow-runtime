/* Capture holds early; runtime permission gates controller/audio requests. */
function prepareHoldAudioLoader(deferred) {
  'use strict';
  const buttons = [...document.querySelectorAll('[data-tdb-hold-audio]')];
  if (window.TDBHoldAudioLoader || !buttons.length) return;
  const lifecycle = new AbortController(),
    options = { signal: lifecycle.signal };
  let flight,
    observer,
    held,
    context,
    enable,
    disposed = false;
  const permission = deferred ? new Promise((resolve) => (enable = resolve)) : Promise.resolve();
  function audioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return (context ||= new AudioContext());
  }
  function clearHint(session) {
    const hint = session.hint;
    if (!hint) return;
    if (hint.element) {
      hint.element.textContent = hint.text;
      for (const property of ['opacity', 'visibility']) {
        if (hint[property]) hint.element.style.setProperty(property, hint[property]);
        else hint.element.style.removeProperty(property);
      }
    }
    session.hint = null;
    if (session.button.getAttribute('aria-description') === hint.message)
      session.button.removeAttribute('aria-description');
    if (session.button.title === hint.message) session.button.title = 'Hold to listen';
  }
  function stopPreparing(session) {
    clearTimeout(session.hintTimer);
    context?.removeEventListener?.('statechange', session.deviceChanged);
    clearHint(session);
  }
  function watchDevice(session) {
    session.deviceChanged = () => {
      if (held !== session || context.state !== 'running' || !session.hint) return;
      clearHint(session);
      session.button.setAttribute('aria-busy', 'true');
      session.button.setAttribute('data-tdb-loading', 'true');
    };
    context.addEventListener?.('statechange', session.deviceChanged);
    session.hintTimer = setTimeout(() => {
      // A first touch-down may not grant playback until touch-up. This is not
      // a download: don't leave an impossible-to-complete hold spinning.
      if (
        held !== session ||
        context.state !== 'suspended' ||
        !['touch', 'pen'].includes(session.pointerType) ||
        navigator.userActivation?.hasBeenActive
      )
        return;
      const message = 'Tap once, then hold';
      const element = session.button
        .closest('[data-tdb-audio-card]')
        ?.querySelector('[data-tdb-audio-words]');
      session.hint = {
        message,
        element,
        text: element?.textContent,
        opacity: element?.style.opacity,
        visibility: element?.style.visibility,
      };
      if (element) {
        element.textContent = message;
        element.style.visibility = 'visible';
        element.style.opacity = '1';
      }
      session.button.removeAttribute('aria-busy');
      session.button.removeAttribute('data-tdb-loading');
      session.button.title = message;
      session.button.setAttribute('aria-description', message);
    }, 250);
  }
  function load() {
    if (!flight) {
      flight = permission
        .then(() => {
          if (disposed) return;
          return window.TDBModules.load(
            window.TDBRelease?.asset('tdb-hold-audio.js') ||
              new URL('tdb-hold-audio.js', window.TDBRuntimeModuleRoot).href,
            { ready: () => typeof window.TDBHoldAudio?.press === 'function' },
          );
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
    stopPreparing(session);
    clearTimeout(session.timeout);
    session.button.setAttribute('aria-pressed', 'false');
    session.button.removeAttribute('aria-busy');
    session.button.removeAttribute('data-tdb-loading');
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
    button.setAttribute('data-tdb-loading', 'true');
    const failed = () => {
      if (held !== session) return;
      release();
      button.title = 'Sound unavailable. Tap once, then hold to try again.';
      button.setAttribute('aria-description', button.title);
    };
    // Bound consent/module/device waits as well as the controller's audio wait.
    session.timeout = setTimeout(failed, 30000);
    if (session.pointer != null) {
      try {
        button.setPointerCapture(session.pointer);
      } catch (_) {}
    }
    try {
      // Unlock synchronously even when a cold module download is still pending.
      const resumed = audioContext().resume();
      watchDevice(session);
      resumed.then(session.deviceChanged, failed);
      // Hand off the original held input while permission is pending so the
      // controller can download audio; playback and visuals wait for readiness.
      load()
        .then(async () => {
          if (!disposed && held === session && button.isConnected && !document.hidden)
            await window.TDBHoldAudio.press(button, input, context, resumed);
          if (held === session) {
            clearTimeout(session.timeout);
            stopPreparing(session);
          }
        })
        .catch(failed);
    } catch (_) {
      failed();
    }
  }
  for (const button of buttons) {
    button.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button === 0 && event.isPrimary !== false)
          press(button, { pointer: event.pointerId, pointerType: event.pointerType });
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
  function unlock() {
    // Prepare the shared device on an earlier tap (including consent), rather
    // than discarding that activation because no speaker has been held yet.
    // No module, sound request or source is started by this preparation.
    if (disposed || navigator.userActivation?.hasBeenActive === false) return;
    try {
      audioContext();
      if (context.state !== 'running' && context.state !== 'closed')
        context.resume().catch(() => {});
    } catch (_) {}
  }
  for (const type of ['pointerup', 'touchend', 'mousedown', 'keydown'])
    window.addEventListener(type, unlock, { ...options, capture: true, passive: true });
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
      if (document.hidden) release(true);
    },
    options,
  );
  function observe() {
    if (window.IntersectionObserver) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) load().catch(() => {});
        },
        { rootMargin: '600px 0px' },
      );
      buttons.forEach((button) => observer.observe(button.closest('[data-tdb-audio-card]')));
    } else load().catch(() => {});
  }
  if (!deferred) observe();
  window.TDBHoldAudioLoader = Object.freeze({
    start() {
      if (!enable || disposed) return;
      enable();
      enable = null;
      observe();
    },
    destroy() {
      release(true);
      disposed = true;
      lifecycle.abort();
      enable?.();
      enable = null;
      observer?.disconnect();
      window.TDBHoldAudio?.destroy();
      if (context && context.state !== 'closed') context.close().catch(() => {});
    },
  });
}
