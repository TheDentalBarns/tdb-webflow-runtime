/* Native Designer buttons; one lazily fetched sound shared by the photo cards. */
function prepareHoldAudio() {
  'use strict';
  if (window.TDBHoldAudio || !document.querySelector('[data-tdb-hold-audio]')) return;
  const lifecycle = new AbortController();
  const buffers = new Map(),
    zooms = new Map(),
    voices = new Set();
  let context,
    active,
    disposed = false;
  const options = { signal: lifecycle.signal };

  function zoom(image, held) {
    if (!image?.animate) return;
    let state = zooms.get(image);
    const current = getComputedStyle(image).scale;
    if (!state) {
      state = { base: current === 'none' ? '1' : current };
      zooms.set(image, state);
    }
    const from = current === 'none' ? '1' : current;
    state.animation?.cancel();
    // Individual scale leaves the parallax owner's translate/transform untouched.
    const target = held
      ? state.base
          .split(/\s+/)
          .map((n) => parseFloat(n) * 1.06)
          .join(' ')
      : state.base;
    const animation = image.animate([{ scale: from }, { scale: target }], {
      duration: window.TDBMotionPolicy?.reduced?.matches ? 0 : held ? 2200 : 900,
      easing: 'cubic-bezier(0.165,0.84,0.44,1)',
      fill: 'forwards',
    });
    state.animation = animation;
    if (!held)
      animation.finished
        .then(() => {
          if (state.animation !== animation) return;
          animation.cancel();
          zooms.delete(image);
        })
        .catch(() => {});
  }

  function stopVoice(voice, immediate = false) {
    if (!voice || voice.stopping) return;
    voice.stopping = true;
    const now = context.currentTime;
    const gain = voice.gain.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      const value = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(value, now);
    }
    gain.linearRampToValueAtTime(0, now + (immediate ? 0 : 0.16));
    voice.source.stop(now + (immediate ? 0 : 0.18));
  }

  function release(immediate = false) {
    const session = active;
    if (!session) return;
    active = null;
    session.button.setAttribute('aria-pressed', 'false');
    session.button.removeAttribute('aria-busy');
    if (session.pointer != null && session.button.hasPointerCapture?.(session.pointer))
      session.button.releasePointerCapture(session.pointer);
    zoom(session.image, false);
    stopVoice(session.voice, immediate);
  }

  function bufferFor(url) {
    if (!buffers.has(url)) {
      const flight = fetch(url, { signal: lifecycle.signal, credentials: 'omit' })
        .then((response) => {
          if (!response.ok) throw Error('Sound download failed');
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes));
      buffers.set(url, flight);
      flight.catch(() => {
        if (buffers.get(url) === flight) buffers.delete(url);
      });
    }
    return buffers.get(url);
  }

  function press(button, input) {
    if (disposed || active?.button === button) return;
    const card = button.closest('[data-tdb-audio-card]');
    const url = card?.getAttribute('data-tdb-audio-src');
    if (!url || button.disabled) return;
    release(true);
    const session = { button, image: card.querySelector('img'), ...input };
    active = session;
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-busy', 'true');
    if (session.pointer != null) {
      try {
        button.setPointerCapture(session.pointer);
      } catch (_) {}
    }
    zoom(session.image, true);
    // Create and resume in the user gesture, before any network/decode await.
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context ||= new AudioContext();
      Promise.all([context.resume(), bufferFor(url)])
        .then(([, buffer]) => {
          // A released/cancelled press can finish downloading, but never play later.
          if (disposed || active !== session || !button.isConnected || document.hidden) return;
          const source = context.createBufferSource();
          const gain = context.createGain();
          const voice = { source, gain, stopping: false };
          session.voice = voice;
          source.buffer = buffer;
          source.loop = true;
          source.connect(gain);
          gain.connect(context.destination);
          gain.gain.setValueAtTime(0, context.currentTime);
          gain.gain.linearRampToValueAtTime(0.85, context.currentTime + 0.18);
          source.onended = () => {
            source.disconnect();
            gain.disconnect();
            voices.delete(voice);
          };
          voices.add(voice);
          source.start();
          button.removeAttribute('aria-busy');
          button.title = 'Hold to listen';
        })
        .catch(() => failed(session));
    } catch (_) {
      failed(session);
    }
  }

  function failed(session) {
    if (disposed || active !== session) return;
    release(true);
    session.button.title = 'Sound unavailable. Hold to try again.';
  }

  function destroy() {
    if (disposed) return;
    release(true);
    disposed = true;
    lifecycle.abort();
    zooms.forEach((state) => state.animation?.cancel());
    zooms.clear();
    voices.forEach((voice) => {
      if (!voice.stopping) stopVoice(voice, true);
      voice.source.disconnect();
      voice.gain.disconnect();
    });
    voices.clear();
    buffers.clear();
    context?.close().catch(() => {});
  }

  document.querySelectorAll('[data-tdb-hold-audio]').forEach((button) => {
    button.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button !== 0 || event.isPrimary === false) return;
        press(button, { pointer: event.pointerId });
      },
      options,
    );
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      button.addEventListener(
        type,
        (event) => {
          if (active?.button === button && active.pointer === event.pointerId) release();
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
        if (active?.button === button && active.key === event.key) {
          event.preventDefault();
          release();
        }
      },
      options,
    );
    button.addEventListener(
      'blur',
      () => {
        if (active?.button === button) release();
      },
      options,
    );
    for (const type of ['click', 'contextmenu'])
      button.addEventListener(type, (event) => event.preventDefault(), options);
  });
  // Capture may be unavailable on older browsers; a release outside still stops.
  for (const type of ['pointerup', 'pointercancel'])
    window.addEventListener(
      type,
      (event) => {
        if (active && active.pointer === event.pointerId) release();
      },
      options,
    );
  window.addEventListener('blur', () => release(true), options);
  window.addEventListener('pagehide', () => release(true), options);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) release(true);
    },
    options,
  );
  window.TDBHoldAudio = Object.freeze({
    version: '1.0.0',
    destroy,
    status: () => ({
      holding: !!active,
      playing: !!active?.voice,
      pending: !!active && !active.voice,
      cachedTracks: buffers.size,
    }),
  });
}
