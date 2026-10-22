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
  // Combine staging comparisons without re-enabling an already-isolated effect.
  const diagnostic =
    location.hostname === 'dentalbarns.webflow.io'
      ? (new URLSearchParams(location.search).get('tdb-speaker-test') || '').split(',')
      : [];
  const noVisuals = diagnostic.includes('no-visuals');
  const noBackdrop = diagnostic.includes('no-backdrop') || noVisuals;
  const noBlur = diagnostic.includes('no-blur') || noBackdrop;
  const noZoom = diagnostic.includes('no-zoom') || noVisuals;
  const retainZoom = diagnostic.includes('retain-zoom');
  const buttonBackdrops = new Map();
  if (noBackdrop)
    document.querySelectorAll('[data-tdb-hold-audio]').forEach((button) => {
      buttonBackdrops.set(button, [button.style.backdropFilter, button.style.webkitBackdropFilter]);
      button.style.backdropFilter = button.style.webkitBackdropFilter = 'none';
    });
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

  function parkEffect(element) {
    effects.get(element)?.cancel();
    effects.delete(element);
    element?.style.removeProperty('visibility');
  }

  function animateEffect(element, frames, options) {
    if (!element?.animate) return;
    effects.get(element)?.cancel();
    // Designer parks inactive decorations. In particular, a transparent,
    // oversized backdrop blur must not remain paintable over the next card.
    element.style.visibility = 'visible';
    const animation = element.animate(frames, options);
    effects.set(element, animation);
    const settled = () => {
      if (effects.get(element) !== animation) return;
      parkEffect(element);
    };
    animation.finished.then(settled, settled);
  }

  function readCircle(element, held) {
    if (!element || noVisuals) return;
    // Read before cancelling: a quick re-press reverses from the visible size.
    const edge = element.parentElement.querySelector('[data-tdb-audio-ripple-edge]');
    const current = getComputedStyle(noBlur && edge ? edge : element);
    const from = {
      scale: current.scale === 'none' ? '0' : current.scale,
      opacity: current.opacity,
    };
    const button = held && element.parentElement.querySelector('[data-tdb-hold-audio]');
    return {
      edge,
      from,
      seed:
        held &&
        Math.min(
          1,
          Math.max(
            parseFloat(from.scale) || 0,
            ((button?.getBoundingClientRect().width || 0) * 2.4) / (parseFloat(current.width) || 1),
          ),
        ),
    };
  }

  function circle(element, held, snapshot = readCircle(element, held)) {
    if (!snapshot) return;
    const { edge, from, seed } = snapshot;
    // A faded-away ripple must not flare back over a neighbouring card when
    // the user releases and starts scrolling. Its completed effects are gone.
    if (!held && Number(from.opacity) === 0) {
      parkEffect(element);
      parkEffect(edge);
      return;
    }
    // Clear the finger quickly, then ease into a slower outward ripple.
    const frames = held
      ? [
          { ...from, offset: 0 },
          { scale: String(seed), opacity: 1, offset: 0.015 },
          { scale: String(seed + (1 - seed) * 0.45), opacity: 0.55, offset: 0.22 },
          { scale: '1', opacity: 0, offset: 1 },
        ]
      : [
          { ...from, offset: 0 },
          { scale: '0', opacity: 0, offset: 1 },
        ];
    const options = {
      duration: window.TDBMotionPolicy?.reduced?.matches ? 0 : held ? holdDuration : 1200,
      easing: held ? 'linear' : 'cubic-bezier(0.4,0,0.2,1)',
      fill: 'forwards',
    };
    if (!noBlur) animateEffect(element, frames, options);
    // A sibling edge avoids masking away the outline or placing the backdrop
    // blur inside an opacity ancestor, which would block the photo backdrop.
    animateEffect(edge, frames, options);
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

  function startVisuals(session, ripple) {
    if (noVisuals) return;
    circle(session.circle, true, ripple);
    showWord(session);
    session.timers = [
      setTimeout(() => showWord(session), holdDuration / 3),
      setTimeout(() => showWord(session), (holdDuration * 2) / 3),
    ];
  }

  function readZoom(image) {
    return !noZoom && image?.animate ? getComputedStyle(image).scale : null;
  }

  function zoom(image, held, current = readZoom(image)) {
    if (noZoom || !image?.animate) return;
    let state = zooms.get(image);
    if (!state) {
      state = { base: current === 'none' ? '1' : current };
      zooms.set(image, state);
    }
    const from = current === 'none' ? '1' : current;
    state.animation?.cancel();
    // Parallax bounds use the native resting crop, independent of this zoom.
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
    // Every zoom can be cancelled by release/re-press, including a held zoom.
    animation.finished
      .then(() => {
        // Staging comparison: retain only the settled image effect, with one
        // record per used image. Re-press replaces it; page exit clears it.
        // This tests completion cleanup without asserting GPU-layer ownership.
        if (!held && !retainZoom && zooms.get(image) === state && state.animation === animation) {
          animation.cancel();
          zooms.delete(image);
        }
      })
      .catch(() => {});
  }

  function position(voice) {
    return (voice.offset + Math.max(0, context.currentTime - voice.startedAt)) % voice.duration;
  }

  function finishVoice(voice) {
    if (!voices.delete(voice)) return;
    clearTimeout(voice.timer);
    positions.set(voice.url, position(voice));
    // A failed start or closed device must not interrupt the rest of cleanup.
    try {
      voice.source.stop();
    } catch (_) {}
    voice.source.disconnect();
    voice.gain.disconnect();
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

  function stopVoice(voice) {
    if (!voice || !voices.has(voice)) return;
    if (voice.stopping) return;
    voice.stopping = true;
    // A curved 600ms tail reaches near-silence before the source is stopped.
    holdGain(voice).setTargetAtTime(0, context.currentTime, 0.08);
    voice.timer = setTimeout(() => finishVoice(voice), 600);
  }

  function release(immediate = false) {
    const session = active;
    if (immediate) {
      // Page exit must also cancel a previous release's tail when no hold is
      // active. Starting zero-duration animations still retains their effects.
      zooms.forEach((state) => state.animation?.cancel());
      zooms.clear();
      effects.forEach((_, element) => parkEffect(element));
      voices.forEach(finishVoice);
    }
    if (!session) return;
    active = null;
    session.cancelReady?.();
    session.timers?.forEach(clearTimeout);
    // A loading-only hold has no visual sequence to return or fade.
    if (!immediate && session.visuals) {
      // Snapshot before any animation writes, rather than alternating layout
      // reads and effect changes three times during the release/scroll handoff.
      const opacity = session.word && getComputedStyle(session.word).opacity;
      const ripple = readCircle(session.circle, false);
      const scale = readZoom(session.image);
      if (session.word) {
        animateEffect(session.word, [{ opacity }, { opacity: 0 }], {
          duration: 350,
          fill: 'forwards',
        });
      }
      circle(session.circle, false, ripple);
      zoom(session.image, false, scale);
    }
    if (!immediate) stopVoice(session.voice);
    session.button.setAttribute('aria-pressed', 'false');
    session.button.removeAttribute('aria-busy');
    session.button.removeAttribute('data-tdb-loading');
    if (session.pointer != null && session.button.hasPointerCapture?.(session.pointer))
      session.button.releasePointerCapture(session.pointer);
  }

  function bufferFor(url) {
    if (!buffers.has(url)) {
      const request = new AbortController();
      const abort = () => request.abort();
      lifecycle.signal.addEventListener('abort', abort, { once: true });
      let timeout;
      const download = fetch(url, { signal: request.signal, credentials: 'omit' })
        .then((response) => {
          if (!response.ok) throw Error('Sound download failed');
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes));
      // decodeAudioData itself cannot be aborted. Race it too, discard the
      // expired flight, and allow a later hold to retry a genuinely fresh fetch.
      const flight = Promise.race([
        download,
        new Promise((_, reject) => {
          timeout = setTimeout(() => {
            request.abort();
            reject(Error('Sound preparation timed out'));
          }, 30000);
        }),
      ]).finally(() => {
        clearTimeout(timeout);
        lifecycle.signal.removeEventListener('abort', abort);
      });
      buffers.set(url, flight);
      flight.catch(() => {
        if (buffers.get(url) === flight) buffers.delete(url);
      });
    }
    return buffers.get(url);
  }

  function running(session, resumed) {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        context.removeEventListener?.('statechange', check);
        session.cancelReady = null;
      };
      const check = () => {
        if (context.state === 'running') {
          cleanup();
          resolve();
        } else if (context.state === 'closed') {
          cleanup();
          reject(Error('Sound device closed'));
        }
      };
      session.cancelReady = () => {
        cleanup();
        reject(Error('Hold cancelled'));
      };
      context.addEventListener?.('statechange', check);
      Promise.resolve(resumed).then(check, (error) => {
        cleanup();
        reject(error);
      });
      check();
    });
  }

  function press(button, input, gestureContext, gestureReady) {
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
    button.setAttribute('data-tdb-loading', 'true');
    if (session.pointer != null) {
      try {
        button.setPointerCapture(session.pointer);
      } catch (_) {}
    }
    // Create and resume in the user gesture, before any network/decode await.
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!context) {
        context = gestureContext || new AudioContext();
        ownsContext = !gestureContext;
        context.addEventListener?.('statechange', onAudioStateChange);
      }
      return Promise.all([running(session, gestureReady || context.resume()), bufferFor(url)])
        .then(async ([, buffer]) => {
          // A released/cancelled press can finish downloading, but never play later.
          if (disposed || active !== session || !button.isConnected || document.hidden) return;
          // Permission may have succeeded before a slow download, then the
          // device was interrupted. Check again immediately before playback.
          if (context.state !== 'running') await running(session, context.resume());
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
          // Start the full visual timeline only after resume, decode and playback.
          const scale = readZoom(session.image);
          const ripple = readCircle(session.circle, true);
          button.removeAttribute('aria-busy');
          button.removeAttribute('data-tdb-loading');
          button.removeAttribute('aria-description');
          button.title = 'Hold to listen';
          zoom(session.image, true, scale);
          startVisuals(session, ripple);
          session.visuals = !noVisuals;
        })
        .catch(() => failed(session));
    } catch (_) {
      failed(session);
    }
  }

  function onAudioStateChange() {
    // Interruptions cannot leave words/zoom running over a silent device.
    if (active?.voice && context.state !== 'running') release(true);
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
    buffers.clear();
    context?.removeEventListener?.('statechange', onAudioStateChange);
    buttonBackdrops.forEach(([backdrop, webkit], button) => {
      button.style.backdropFilter = backdrop;
      button.style.webkitBackdropFilter = webkit;
    });
    if (ownsContext) context?.close().catch(() => {});
  }

  window.TDBHoldAudio = Object.freeze({
    version: '1.4.2',
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
