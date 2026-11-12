import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectPartnerArticles,
  PARTNER_COLLECTION,
  BLOG_COLLECTION,
  PRESS_CATEGORY,
} from './partners.mjs';
import { createFeedService } from './feed.mjs';
const asset = 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/';
const published = { lastPublished: '2026-11-01T10:00:00Z', isArchived: false };
const partner = {
  ...published,
  id: 'press',
  fieldData: {
    name: 'Publisher',
    slug: 'publisher',
    category: PRESS_CATEGORY,
    'related-articles': ['old', 'new', 'old', 'unpublished', 'archived'],
    paragraph: '<p><a href="https://outdated.example/">Old manual link</a></p>',
    logo: { url: asset + 'logo.svg' },
    image: { url: asset + 'old.webp' },
    link: 'https://publisher.example/',
  },
};
const post = (id, createdOn, changes = {}) => ({
  ...published,
  id,
  createdOn,
  fieldData: {
    name: 'Article ' + id,
    slug: 'article-' + id,
    'thumbnail-image': { url: asset + id + '.webp', alt: 'Thumbnail ' + id },
    'post-body': 'Private body not needed',
    ...changes,
  },
});
const old = post('old', '2025-01-01T00:00:00Z');
const latest = post('new', '2026-01-01T00:00:00Z');

test('related articles use only selected published Blog entries, newest first, with one current thumbnail', () => {
  const { partners } = projectPartnerArticles(
    [partner],
    [
      old,
      latest,
      post('unrelated', '2026-02-01T00:00:00Z'),
      { ...post('unpublished', '2026-03-01T00:00:00Z'), lastPublished: null, isDraft: true },
      { ...post('archived', '2026-04-01T00:00:00Z'), isArchived: true },
    ],
  );
  const card = partners[0];
  assert.deepEqual(card.articles, [
    { id: 'new', title: 'Article new', path: '/post/article-new' },
    { id: 'old', title: 'Article old', path: '/post/article-old' },
  ]);
  assert.equal(card.image, asset + 'new.webp');
  assert.equal(card.imageAlt, 'Thumbnail new');
  assert.equal(card.body, '');
  assert.equal(card.link, 'https://publisher.example/');
  assert.equal(JSON.stringify(card).includes('Private body'), false);
});

test('published Blog title, slug and thumbnail changes drive the next projection without editing the partner', () => {
  const updated = {
    ...latest,
    fieldData: {
      ...latest.fieldData,
      name: 'Revised title',
      slug: 'revised-story',
      'thumbnail-image': { url: asset + 'revised.webp', alt: 'Revised image' },
    },
  };
  const card = projectPartnerArticles([partner], [old, updated]).partners[0];
  assert.equal(card.articles[0].title, 'Revised title');
  assert.equal(card.articles[0].path, '/post/revised-story');
  assert.equal(card.image, asset + 'revised.webp');
  const removed = projectPartnerArticles([partner], [old, { ...latest, lastPublished: null }])
    .partners[0];
  assert.equal(removed.articles.length, 1);
  assert.equal(removed.image, asset + 'old.webp');
  const empty = projectPartnerArticles(
    [{ ...partner, fieldData: { ...partner.fieldData, 'related-articles': [] } }],
    [old, latest],
  ).partners[0];
  assert.deepEqual(empty.articles, []);
  assert.equal(empty.body, '');
  assert.equal(empty.image, asset + 'logo.svg');
});

test('brand copy remains unchanged and malformed article paths cannot enter the feed', () => {
  const brand = {
    ...published,
    id: 'brand',
    fieldData: {
      name: 'Brand',
      slug: 'brand',
      paragraph: '<p>Brand copy</p>',
      logo: { url: asset + 'brand.svg' },
      image: { url: asset + 'brand.webp' },
      link: 'https://brand.example/',
    },
  };
  assert.equal(
    projectPartnerArticles([brand, partner], [old, latest]).partners[0].body,
    '<p>Brand copy</p>',
  );
  for (const slug of ['../other', 'story?query', 'https://external.example/', 'story\\path'])
    assert.throws(() =>
      projectPartnerArticles(
        [partner],
        [old, { ...latest, fieldData: { ...latest.fieldData, slug } }],
      ),
    );
});

test('v2 joins live Partner and Blog collections and uses an independent cached snapshot', async () => {
  const calls = [];
  const keys = [];
  const service = createFeedService({
    hostname: 'test.example',
    fetcher: async (url) => {
      calls.push(url);
      const items = url.includes('/' + PARTNER_COLLECTION + '/') ? [partner] : [old, latest];
      return Response.json({ items, pagination: { offset: 0, total: items.length } });
    },
  });
  const env = {
    WEBFLOW_API_TOKEN: 'test',
    CONTENT_FEEDS: { get: async () => null, put: async (key) => keys.push(key) },
  };
  const request = new Request('https://test.example/tdb-content/v2/partners.json');
  const response = await service(request, env);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.partners[0].articles.length, 2);
  assert.deepEqual(
    calls.sort(),
    [PARTNER_COLLECTION, BLOG_COLLECTION]
      .map((id) => `https://api.webflow.com/v2/collections/${id}/items/live?limit=100&offset=0`)
      .sort(),
  );
  assert.ok(keys.includes('partners:related-articles:v2'));
  await service(request, env);
  assert.equal(calls.length, 2);
});
