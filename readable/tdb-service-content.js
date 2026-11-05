/* Service content helpers. CMS and Designer own copy, images and structure. */
(function () {
  function getText(el) {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function cleanStepTitle(raw) {
    return raw.replace(/^\s*\d+\s*[\.\):-]?\s*/, '').trim();
  }

  function toAbsoluteUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }

  function normaliseDate(raw) {
    if (!raw) return '';
    const value = String(raw).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toISOString();
  }

  function getThumbnailUrl(step) {
    const marked =
      step.querySelector('[data-video-thumbnail]') ||
      step.querySelector('.vimeo-player__placeholder');

    let img = null;

    if (marked) {
      img = marked.tagName === 'IMG' ? marked : marked.querySelector('img');
    }

    if (!img) {
      img = step.querySelector('img');
    }

    const src = img?.getAttribute('src') || img?.currentSrc || '';
    return toAbsoluteUrl(src);
  }

  function buildSchema() {
    const pageUrl = window.location.origin + window.location.pathname;
    const processBlocks = Array.from(
      document.querySelectorAll('[data-tdb-service-process][data-process-schema]'),
    );

    if (!processBlocks.length) return;

    const graph = [];

    processBlocks.forEach((block, blockIndex) => {
      const processName = block.getAttribute('data-process-name') || 'Treatment Process';

      const serviceId = block.getAttribute('data-service-id') || `${pageUrl}#service`;

      const publisherId =
        block.getAttribute('data-publisher-id') || 'https://www.thedentalbarns.co.uk/#dentist';

      const steps = Array.from(block.querySelectorAll('[data-process-step]'));

      if (!steps.length) return;

      const validSteps = steps
        .map((step, index) => {
          const titleEl = step.querySelector('[data-step-title]');
          const descEl = step.querySelector('[data-step-description]');
          const videoEl = step.querySelector('[data-vimeo-video-id]');

          const rawTitle = getText(titleEl);
          const title = cleanStepTitle(rawTitle);
          const description = getText(descEl);
          const videoId = videoEl?.getAttribute('data-vimeo-video-id') || '';
          const uploadDate = normaliseDate(
            videoEl?.getAttribute('data-upload-date') ||
              step.getAttribute('data-upload-date') ||
              block.getAttribute('data-process-upload-date') ||
              '',
          );
          const thumbnailUrl = getThumbnailUrl(step);

          const existingAnchor = step.id || step.getAttribute('data-step-anchor') || '';

          const anchor = existingAnchor || `process-${blockIndex + 1}-step-${index + 1}`;

          if (!step.id) {
            step.id = anchor;
          }

          return {
            position: index + 1,
            title,
            description,
            videoId,
            uploadDate,
            thumbnailUrl,
            url: `${pageUrl}#${anchor}`,
            videoRef: `${pageUrl}#process-${blockIndex + 1}-video-${index + 1}`,
            publisherId,
            processName,
            serviceId,
          };
        })
        .filter((step) => step.title && step.videoId && step.thumbnailUrl);

      if (!validSteps.length) return;

      validSteps.forEach((step) => {
        const videoObject = {
          '@type': 'VideoObject',
          '@id': step.videoRef,
          name: step.title,
          description: step.description || `${step.processName} – ${step.title}`,
          thumbnailUrl: [step.thumbnailUrl],
          embedUrl: `https://player.vimeo.com/video/${step.videoId}`,
          url: step.url,
          isPartOf: {
            '@type': 'WebPage',
            '@id': pageUrl,
          },
          about: {
            '@id': step.serviceId,
          },
          publisher: {
            '@id': step.publisherId,
          },
        };

        if (step.uploadDate) {
          videoObject.uploadDate = step.uploadDate;
        }

        graph.push(videoObject);
      });
    });

    if (!graph.length) return;

    const existing = document.getElementById('tdb-process-video-schema');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'tdb-process-video-schema';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graph,
    });

    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSchema, { once: true });
  } else {
    buildSchema();
  }
})();

(() => {
  if (!/^\/services\/smile-design\/?$/.test(location.pathname)) return;
  function start() {
    const button = document.querySelector('main a[href="#All-treatments"]');
    if (!button) return;
    button.setAttribute('href', '#VIP');
    button.setAttribute('aria-label', 'Join the Smile Design Waitlist');
    button.firstElementChild.textContent = 'Join the Smile Design Waitlist';
    button.querySelector('.is-down')?.classList.remove('is-down');
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
