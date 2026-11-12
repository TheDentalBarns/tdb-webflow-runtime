const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('press cards share brand images, headings and website CTA while retaining per-partner articles', async () => {
  const w = new JSDOM('<div id="host"></div>', {
    url: 'https://dentalbarns.webflow.io/blog',
    runScripts: 'outside-only',
  }).window;
  try {
    const asset = 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/';
    w.fetch = async () =>
      Response.json({
        version: 1,
        feed: 'partners',
        checkedAt: Date.now(),
        partners: [
          {
            id: 'id-a',
            slug: 'press-a',
            name: 'Publisher A',
            body: '<p><a href="https://a.example/one">First article</a></p><p><a href="https://a.example/two">Second article</a></p><p><a href="https://a.example/one">First article again</a></p>',
            logo: asset + 'a.svg',
            image: asset + 'a.svg',
            imageAlt: 'A',
            link: 'https://a.example/',
          },
          {
            id: 'id-b',
            slug: 'press-b',
            name: 'Publisher B',
            body: '<p><a href="https://b.example/story" onclick="bad()">Another article</a></p><script>bad()</script>',
            logo: asset + 'b.svg',
            image: asset + 'b.svg',
            imageAlt: 'B',
            link: 'https://b.example/',
          },
          {
            id: 'id-brand',
            slug: 'brand',
            name: 'Brand',
            body: '<p>Our partner <a href="https://brand.example/story">story</a></p>',
            logo: asset + 'c.svg',
            image: asset + 'c.webp',
            imageAlt: 'C',
            link: 'https://brand.example/',
          },
        ],
      });
    w.eval(fs.readFileSync('src/logo-marquee/partner-card.js', 'utf8'));
    const items = ['id-a', 'id-b', 'id-brand'].map((id) => {
      const n = w.document.createElement('div');
      n.dataset.itemId = id;
      return n;
    });
    const prepared = await w.TDBPartnerCard.prepare(w.document.querySelector('#host'), items);
    const [a, b, brand] = prepared.sources;
    assert.deepEqual(
      Array.from(a.querySelectorAll('.tdb-partner-article-links a'), (n) => n.href),
      ['https://a.example/one', 'https://a.example/two'],
    );
    assert.deepEqual(
      Array.from(b.querySelectorAll('.tdb-partner-article-links a'), (n) => n.href),
      ['https://b.example/story'],
    );
    for (const n of [a, b]) {
      assert.equal(n.querySelectorAll('script,[onclick]').length, 0);
      assert.ok(n.querySelector('.tooltip2_image-wrapper img'));
      assert.ok(
        n.querySelector('.text-style-tagline-restored').textContent.startsWith('Publisher '),
      );
      assert.ok(n.querySelector('[data-tdb-partner-link]'));
      assert.ok(n.querySelector('[data-tdb-partner-articles][data-tdb-partner-name]'));
      assert.ok(
        Array.from(n.querySelectorAll('a')).every(
          (a) => a.target === '_blank' && a.rel === 'noopener noreferrer',
        ),
      );
    }
    assert.equal(a.querySelector('[data-tdb-partner-link]').href, 'https://a.example/');
    assert.equal(b.querySelector('[data-tdb-partner-link]').href, 'https://b.example/');
    assert.equal(a.querySelectorAll('.tdb-partner-article-icon[aria-hidden="true"]').length, 2);
    assert.equal(b.querySelectorAll('.tdb-partner-article-icon[aria-hidden="true"]').length, 1);
    const sizing = prepared.fragment.querySelector('.tdb-partner-sizing');
    assert.equal(sizing.getAttribute('aria-hidden'), 'true');
    assert.equal(sizing.inert, true);
    assert.equal(sizing.children.length, 3);
    assert.equal(sizing.querySelectorAll('img').length, 0);
    assert.ok(brand.querySelector('img'));
    assert.equal(brand.querySelector('[data-tdb-partner-link]').href, 'https://brand.example/');
  } finally {
    w.close();
  }
});

test('CMS-related articles retain the current site origin and open internal posts in the same tab', async () => {
  for (const origin of ['https://dentalbarns.webflow.io', 'https://www.thedentalbarns.co.uk']) {
    const w = new JSDOM('<div id="host"></div>', {
      url: origin + '/blog',
      runScripts: 'outside-only',
    }).window;
    try {
      const asset = 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/';
      w.fetch = async (url) => {
        assert.ok(url.endsWith('/tdb-content/v2/partners.json'));
        return Response.json({
          version: 1,
          feed: 'partners',
          checkedAt: Date.now(),
          partners: [
            {
              id: 'related',
              slug: 'press-related',
              name: 'Publisher',
              body: '<p><a href="https://old.example/">Old link</a></p>',
              logo: asset + 'logo.svg',
              image: asset + 'latest.webp',
              imageAlt: 'Newest story',
              link: 'https://publisher.example/',
              articles: [
                { title: 'Current CMS title', path: '/post/newest-story' },
                { title: 'Earlier CMS title', path: '/post/earlier-story' },
              ],
            },
          ],
        });
      };
      w.eval(fs.readFileSync('src/logo-marquee/partner-card.js', 'utf8'));
      const item = w.document.createElement('div');
      item.dataset.itemId = 'related';
      const {
        sources: [card],
      } = await w.TDBPartnerCard.prepare(w.document.querySelector('#host'), [item]);
      w.document.querySelector('#host').append(card);
      const links = Array.from(card.querySelectorAll('.tdb-partner-article-links a'));
      assert.deepEqual(
        links.map((a) => a.href),
        [origin + '/post/newest-story', origin + '/post/earlier-story'],
      );
      assert.deepEqual(
        links.map((a) => a.textContent.trim()),
        ['Current CMS title', 'Earlier CMS title'],
      );
      assert.ok(links.every((a) => !a.target));
      assert.ok(links.every((a) => a.querySelector('svg[aria-hidden="true"]')));
      assert.equal(card.querySelector('.tooltip2_image').src, asset + 'latest.webp');
      assert.equal(card.querySelector('[data-tdb-partner-link]').target, '_blank');
      assert.equal(card.textContent.includes('Old link'), false);
    } finally {
      w.close();
    }
  }
});

test('related article paths reject external, traversal and query URLs', async () => {
  for (const path of [
    'https://other.example/post/story',
    '//other.example/post/story',
    '/post/../private',
    '/post/%2fprivate',
    '/post/story?token=private',
  ]) {
    const w = new JSDOM('<div id="host"></div>', {
      url: 'https://dentalbarns.webflow.io/blog',
      runScripts: 'outside-only',
    }).window;
    try {
      const asset = 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/';
      w.fetch = async () =>
        Response.json({
          version: 1,
          feed: 'partners',
          checkedAt: Date.now(),
          partners: [
            {
              id: 'related',
              slug: 'press-related',
              name: 'Publisher',
              body: '',
              logo: asset + 'logo.svg',
              image: asset + 'image.webp',
              imageAlt: '',
              link: 'https://publisher.example/',
              articles: [{ title: 'Title', path }],
            },
          ],
        });
      w.eval(fs.readFileSync('src/logo-marquee/partner-card.js', 'utf8'));
      await assert.rejects(w.TDBPartnerCard.prepare(w.document.querySelector('#host'), []));
    } finally {
      w.close();
    }
  }
});
