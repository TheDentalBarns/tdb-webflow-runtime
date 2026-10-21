/* Proximity-loaded controller. Native Designer buttons are owned by the loader. */
(function prepareHoldAudio() {
  'use strict';
  if (window.TDBHoldAudio || !document.querySelector('[data-tdb-hold-audio]')) return;
  const lifecycle = new AbortController();
  const buffers = new Map(),
    positions = new Map(),
    zooms = new Map(),
    effects = new Map(),
    voices = new Set();
  const holdDuration = 10000;
  const words = (
    document
      .querySelector('[data-tdb-audio-word-sequence]')
      ?.getAttribute('data-tdb-audio-word-sequence') ||
    document.querySelector('[data-tdb-audio-words]')?.getAttribute('data-tdb-audio-words') ||
    ''
  )
    .split('|')
    .map((word) => word.trim())
    .filter(Boolean);
  let nextWord = 0;
  let context,
    ownsContext = false,
    active,
    disposed = false,
    lastUrl;

  function animateEffect(element, frames, options, retain = false) {
    if (!element?.animate) return;
    effects.get(element)?.cancel();
    const animation = element.animate(frames, options);
    effects.set(element, animation);
    animation.finished
      .then(() => {
        if (retain || effects.get(element) !== animation) return;
        animation.cancel();
        effects.delete(element);
      })
      .catch(() => {});
  }

  function circle(element, held, immediate = false) {
    if (!element) return;
    // Read before cancelling: a quick re-press reverses from the visible size.
    const current = getComputedStyle(element);
    const from = {
      scale: current.scale === 'none' ? '0' : current.scale,
      opacity: current.opacity,
    };
    animateEffect(
      element,
      [from, { scale: held ? '1' : '0', opacity: held ? '1' : '0' }],
      {
        duration:
          immediate || window.TDBMotionPolicy?.reduced?.matches ? 0 : held ? holdDuration : 1200,
        easing: held ? 'linear' : 'cubic-bezier(0.165,0.84,0.44,1)',
        fill: 'forwards',
      },
      held,
    );
  }

  function showWord(session) {
    if (active !== session || !session.word || !words.length) return;
    session.word.textContent = words[nextWord];
    nextWord = (nextWord + 1) % words.length;
    animateEffect(
      session.word,
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.2 },
        { opacity: 1, offset: 0.78 },
        { opacity: 0, offset: 1 },
      ],
      { duration: holdDuration / 3, easing: 'linear', fill: 'forwards' },
    );
  }

  function startVisuals(session) {
    circle(session.circle, true);
    showWord(session);
    session.timers = [
      setTimeout(() => showWord(session), holdDuration / 3),
      setTimeout(() => showWord(session), (holdDuration * 2) / 3),
    ];
  }

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
      duration: window.TDBMotionPolicy?.reduced?.matches ? 0 : held ? 10000 : 1200,
      easing: held ? 'linear' : 'cubic-bezier(0.165,0.84,0.44,1)',
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

  function position(voice) {
    return (voice.offset + Math.max(0, context.currentTime - voice.startedAt)) % voice.duration;
  }

  function finishVoice(voice) {
    clearTimeout(voice.timer);
    positions.set(voice.url, position(voice));
    voice.source.stop();
    voice.source.disconnect();
    voice.gain.disconnect();
    voices.delete(voice);
  }

  function holdGain(voice) {
    const now = context.currentTime;
    const gain = voice.gain.gain;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      const value = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(value, now);
    }
    return gain;
  }

  function stopVoice(voice, immediate = false) {
    if (!voice || !voices.has(voice)) return;
    if (immediate) return finishVoice(voice);
    if (voice.stopping) return;
    voice.stopping = true;
    // A curved 600ms tail reaches near-silence before the source is stopped.
    holdGain(voice).setTargetAtTime(0, context.currentTime, 0.08);
    voice.timer = setTimeout(() => finishVoice(voice), 600);
  }

  function release(immediate = false) {
    const session = active;
    if (!session) return;
    active = null;
    session.timers?.forEach(clearTimeout);
    if (session.word) {
      const opacity = getComputedStyle(session.word).opacity;
      animateEffect(session.word, [{ opacity }, { opacity: 0 }], {
        duration: immediate ? 0 : 350,
        fill: 'forwards',
      });
    }
    circle(session.circle, false, immediate);
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

  function press(button, input, gestureContext) {
    if (disposed || active?.button === button) return;
    const card = button.closest('[data-tdb-audio-card]');
    const url = card?.getAttribute('data-tdb-audio-src');
    if (!url || button.disabled) return;
    release();
    const session = {
      button,
      image: card.querySelector('img'),
      word: card.querySelector('[data-tdb-audio-words]'),
      circle: card.querySelector('[data-tdb-audio-circle]'),
      ...input,
    };
    active = session;
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-busy', 'true');
    if (session.pointer != null) {
      try {
        button.setPointerCapture(session.pointer);
      } catch (_) {}
    }
    zoom(session.image, true);
    startVisuals(session);
    // Create and resume in the user gesture, before any network/decode await.
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!context) {
        context = gestureContext || new AudioContext();
        ownsContext = !gestureContext;
      }
      Promise.all([context.resume(), bufferFor(url)])
        .then(([, buffer]) => {
          // A released/cancelled press can finish downloading, but never play later.
          if (disposed || active !== session || !button.isConnected || document.hidden) return;
          lastUrl = url;
          // A quick re-press continues the existing fading source without a jump.
          let voice = [...voices].find((item) => item.url === url);
          if (voice) {
            clearTimeout(voice.timer);
            voice.stopping = false;
            holdGain(voice).setTargetAtTime(0.85, context.currentTime, 0.06);
          } else {
            const source = context.createBufferSource();
            const gain = context.createGain();
            const offset = (positions.get(url) || 0) % buffer.duration;
            voice = {
              source,
              gain,
              url,
              offset,
              duration: buffer.duration,
              startedAt: context.currentTime,
              stopping: false,
            };
            source.buffer = buffer;
            source.loop = true;
            source.connect(gain);
            gain.connect(context.destination);
            gain.gain.setValueAtTime(0, context.currentTime);
            gain.gain.setTargetAtTime(0.85, context.currentTime, 0.06);
            voices.add(voice);
            source.start(0, offset);
          }
          session.voice = voice;
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
    effects.forEach((animation) => animation.cancel());
    effects.clear();
    voices.forEach(finishVoice);
    voices.clear();
    buffers.clear();
    if (ownsContext) context?.close().catch(() => {});
  }

  window.TDBHoldAudio = Object.freeze({
    version: '1.2.0',
    press,
    release,
    destroy,
    status: () => ({
      holding: !!active,
      playing: !!active?.voice,
      pending: !!active && !active.voice,
      cachedTracks: buffers.size,
      fading: [...voices].some((voice) => voice.stopping),
      positionSeconds: [...voices].find((voice) => voice.url === lastUrl)
        ? position([...voices].find((voice) => voice.url === lastUrl))
        : positions.get(lastUrl) || 0,
    }),
  });
})();
