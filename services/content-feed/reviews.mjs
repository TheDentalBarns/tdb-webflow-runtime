// Project only fields already used by the public review UI. Inputs must come
// from Webflow's live endpoints, never the staged collection listing.
import { CONTEXT_COLLECTIONS, addReviewContexts } from './review-contexts.mjs';
export const REVIEW_COLLECTIONS = [
  '6ab6638e2159a2087d5413c9',
  '6ac111967d68e43d43768534',
  '69948cc9ceae27ae3114cb28',
  ...CONTEXT_COLLECTIONS,
];
export const REVIEW_BATCH_PATH = '/tdb-content/v2/reviews.json';
export const reviewRevisionKey = (revision) => `reviews:batch:v2:${revision}`;

// A compact, public selection index. Bodies, quotations and responses only travel
// in explicitly requested batches. Every batch is pinned to this index revision.
export function reviewIndex(snapshot) {
  return {
    version: 2,
    feed: 'reviews',
    checkedAt: snapshot.checkedAt,
    average: snapshot.average,
    total: snapshot.total,
    featured: snapshot.featured,
    ...(snapshot.contexts ? { contexts: snapshot.contexts } : {}),
    index: snapshot.records.map((record) => {
      const { id, name, platform, date, rating, rank, snippetRank, nRank, iRank, lRank, topics } =
        record;
      return {
        id,
        name,
        platform,
        date,
        rating,
        rank,
        snippetRank,
        nRank,
        iRank,
        lRank,
        topics,
        ...(record.snippetRanks
          ? { snippetRanks: record.snippetRanks, duplicate: record.duplicate }
          : {}),
        excerptTopics: Object.keys(record.excerpts).filter((topic) => record.excerpts[topic]),
      };
    }),
  };
}

export function reviewBatchQuery(url) {
  if (!url.search) return null;
  if (
    [...url.searchParams.keys()].some((key) => !['ids', 'revision'].includes(key)) ||
    url.searchParams.getAll('ids').length !== 1 ||
    url.searchParams.getAll('revision').length !== 1
  )
    throw Error('invalid_review_query');
  const ids = url.searchParams.get('ids').split(',');
  const rawRevision = url.searchParams.get('revision');
  const revision = Number(rawRevision);
  if (
    !/^\d{13}$/.test(rawRevision) ||
    !Number.isSafeInteger(revision) ||
    ids.length > 20 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !/^[a-z0-9-]{1,256}$/.test(id))
  )
    throw Error('invalid_review_query');
  return { ids, revision };
}
const platforms = {
  efe6db2067ed0fd456d38bc2e521b4bd: 'Google',
  '0d3340cdd96a32712e4c9d730e89df7d': 'Yell',
  a0c3d879d008891aec3a0bd741c1ea8c: 'Doctify',
  '17153ef92f97216cb750196d50c29c0d': 'Facebook',
  '9893e84e222a65c3ea16e8537dcc34e6': 'Direct testimonial',
  '18e8b0757d8babb418cb99c0b6830ea0': 'Other',
};
const topics = {
  'nervous-patient-care': 'nervous',
  invisalign: 'invisalign',
  'clear-aligners': 'clear-aligners',
  'composite-bonding': 'bonding',
  veneers: 'veneers',
  whitening: 'whitening',
  hygiene: 'hygiene',
  'natural-results': 'natural',
  comfort: 'comfort',
  'clear-explanations': 'assessment',
  'welcoming-team': 'team',
  'calm-environment': 'environment',
  location: 'location',
  technology: 'technology',
};
const invalid = () => {
  throw Error('invalid_review_data');
};
const text = (value, max = 20000) => {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max) invalid();
  return value.trim();
};
const live = (item) => item?.lastPublished && item.isArchived === false;
const rank = (value) => (Number.isFinite(value) && value > 0 ? value : 999);
const url = (value) => {
  if (!value) return '';
  const parsed = new URL(text(value, 2048));
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) invalid();
  return parsed.href;
};
const chronological = (a, b) =>
  (Date.parse(a.createdOn) || 0) - (Date.parse(b.createdOn) || 0) ||
  String(a.id).localeCompare(String(b.id));
const nativeOrder = (field) => (a, b) => {
  const av = a.fieldData[field],
    bv = b.fieldData[field];
  // Match Webflow's ascending order: empty values first, then oldest-created ties.
  return (av == null ? (bv == null ? 0 : -1) : bv == null ? 1 : av - bv) || chronological(a, b);
};

export function projectReviews(items, responses, summaries, ...contextInputs) {
  if (![items, responses, summaries].every(Array.isArray)) invalid();
  const selected = items
    .filter(
      (item) =>
        live(item) &&
        item.fieldData?.['approved-for-display'] === true &&
        item.fieldData?.['exclude-from-display'] !== true,
    )
    .sort(nativeOrder('editorial-priority'));
  const seen = new Set(),
    byId = new Map();
  const records = selected.map((item) => {
    const f = item.fieldData,
      id = text(f.slug, 256),
      name = text(f['reviewer-display-name'], 256);
    const body = text(f['full-review']);
    if (!/^[a-z0-9-]+$/.test(id) || !name || !body || seen.has(id)) invalid();
    seen.add(id);
    const platform = platforms[f['platform-2']];
    if (!platform) invalid();
    const date = text(f['review-date'], 40);
    if (date && !Number.isFinite(Date.parse(date))) invalid();
    const excerpts = {},
      flags = [];
    for (const [field, topic] of Object.entries(topics)) {
      if (f['topic-' + field] === true)
        flags.push(topic === 'invisalign' ? 'clear-aligners' : topic);
      const excerpt = text(f['excerpt-' + field], 5000);
      if (excerpt) excerpts[topic] = excerpt;
    }
    excerpts['clear-aligners'] = excerpts['clear-aligners'] || excerpts.invisalign || '';
    excerpts.invisalign = excerpts.invisalign || excerpts['clear-aligners'] || '';
    const rating = f['star-rating'];
    const record = {
      id,
      name,
      text: body,
      excerpt: text(f['featured-excerpt'], 5000),
      platform,
      date: date ? date.slice(0, 10) : '',
      displayDate: text(f['display-date'], 160),
      rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
      approx: f['date-approximate'] === true,
      historic: f['review-subject'] === '78902de9c8ddcc3437156f6120e0cc9c',
      rank: rank(f['editorial-priority']),
      snippetRank: rank(f['snippet-rank']),
      nRank: rank(f['nervous-priority']),
      iRank: rank(f['invisalign-priority']),
      lRank: rank(f['location-snippet-rank']),
      duplicate: text(f['duplicate-group'], 256),
      url: url(f['source-url'] || f['source-profile-url']),
      direct: Boolean(f['source-url']),
      topics: [...new Set(flags)],
      excerpts,
      response: '',
      showResponse: false,
    };
    byId.set(item.id, record);
    return record;
  });
  for (const item of responses
    .filter((item) => live(item) && item.fieldData?.['approved-for-display'] === true)
    .sort(chronological)) {
    const record = byId.get(item.fieldData.review);
    if (!record) continue;
    record.response = text(item.fieldData.response);
    record.showResponse = Boolean(record.response);
  }
  // Both statistics describe the published, approved records in this feed.
  // Cross-posts remain separate platform reviews. Unknown ratings contribute to
  // the total, but never count as zero-star reviews in the average.
  const total = records.length;
  const rated = records.filter((record) => record.rating !== null);
  const average = rated.length
    ? rated.reduce((sum, record) => sum + record.rating, 0) / rated.length
    : 0;
  // Existing native quote list: non-empty excerpt, ascending snippet rank,
  // one-item offset and three featured identities. Keep its editorial policy.
  const featured = selected
    .filter((item) => text(item.fieldData['featured-excerpt'], 5000))
    .sort(nativeOrder('snippet-rank'))
    .slice(1, 4)
    .map((item) => item.fieldData.slug);
  const contexts = contextInputs.length
    ? addReviewContexts(records, items, ...contextInputs)
    : null;
  return { records, average, total, featured, ...(contexts ? { contexts } : {}) };
}
