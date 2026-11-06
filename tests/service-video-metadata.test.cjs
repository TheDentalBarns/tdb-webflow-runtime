const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('src/embeds/service-video-metadata.html', 'utf8');
const source = html.match(/<script[^>]*>([\s\S]*)<\/script>/)[1];

test('journey embed derives five video records from current CMS-bound content without altering links or loading media', () => {
  const dom = new JSDOM(
    '<a href="#VIP">Join the Smile Design Waitlist</a><section data-tdb-service-process data-process-schema data-process-upload-date="2026-03-01T09:00:00Z"></section>',
    { url: 'https://dentalbarns.webflow.io/services/smile-design', runScripts: 'outside-only' },
  );
  try {
    const w = dom.window,
      root = w.document.querySelector('section');
    Object.defineProperty(w.document, 'readyState', { value: 'complete' });
    w.fetch = () => {
      throw Error('metadata must not fetch media');
    };
    for (let i = 0; i < 5; i++) {
      const step = w.document.createElement('div');
      step.setAttribute('data-process-step', '');
      step.innerHTML = `<h3 data-step-title>${i + 1}. Plan &amp; reflect</h3><div data-step-description><p>Care &amp; choices — "your smile".</p></div><div data-vimeo-video-id="${123 + i}"><img data-video-thumbnail src="/poster-${i}.webp"></div>`;
      root.append(step);
    }
    w.eval(source);
    const graph = JSON.parse(w.document.getElementById('tdb-process-video-schema').textContent)[
      '@graph'
    ];
    assert.equal(graph.length, 5);
    assert.equal(graph[0].name, 'Plan & reflect');
    assert.equal(graph[0].description, 'Care & choices — "your smile".');
    assert.equal(graph[0].thumbnailUrl[0], 'https://dentalbarns.webflow.io/poster-0.webp');
    assert.equal(graph[4].embedUrl, 'https://player.vimeo.com/video/127');
    assert.match(graph[0].uploadDate, /2026-03-01/);
    assert.equal(w.document.querySelector('a').getAttribute('href'), '#VIP');
    w.eval(source);
    assert.equal(w.document.querySelectorAll('#tdb-process-video-schema').length, 1);
    root.lastElementChild
      .querySelector('[data-vimeo-video-id]')
      .removeAttribute('data-vimeo-video-id');
    w.eval(source);
    assert.equal(
      JSON.parse(w.document.getElementById('tdb-process-video-schema').textContent)['@graph']
        .length,
      4,
    );
  } finally {
    dom.window.close();
  }
});
