// Public, published excerpt selections. CMS references and editorial notes stay private.
export const CONTEXT_COLLECTIONS = [
  '6ac150e4098f2e48768331b9', // Review Excerpts
  '6ac153f39123cdbfc15896bb', // Review Tags
  '6ac153f4b4f8a86d453e240d', // Review Page Contexts
  '6785071ede094cc233e0c717', // Services: resolve current published slugs
  '678507282f3f5412bfe2b4e6', // Treatments
  '699058c919f4a1adcc157cad', // Area Treatment Pages
];
const aliases = {
  'nervous-patient-care': 'nervous',
  invisalign: 'clear-aligners',
  'composite-bonding': 'bonding',
  'natural-results': 'natural',
  'clear-explanations': 'assessment',
  'welcoming-team': 'team',
  'calm-environment': 'environment',
};
export const canonicalTopic = (name) => aliases[name] || name;
const live = (item) => item?.lastPublished && item.isArchived === false;
const rank = (value) => (Number.isFinite(value) && value > 0 ? value : 999999);
const safeKey = (value) => typeof value === 'string' && /^[a-z0-9-]{1,256}$/.test(value);
const safePath = (value) =>
  typeof value === 'string' && /^\/(?:[a-zA-Z0-9_/-]*)$/.test(value)
    ? value.replace(/\/+$/, '') || '/'
    : '';

export function addReviewContexts(
  records,
  masters,
  excerpts,
  tags,
  contexts,
  services,
  treatments,
  areas,
) {
  if (![excerpts, tags, contexts, services, treatments, areas].every(Array.isArray))
    throw Error('invalid_review_contexts');
  const bySlug = new Map(records.map((r) => [r.id, r]));
  const byMaster = new Map(masters.map((i) => [i.id, bySlug.get(i.fieldData.slug)]));
  const byTag = new Map(
    tags
      .filter(live)
      .filter((i) => safeKey(i.fieldData.slug))
      .map((i) => [i.id, canonicalTopic(i.fieldData.slug)]),
  );
  for (const record of records) {
    record.snippetRanks = {};
    // The excerpt collection is authoritative; a disabled excerpt must not leak
    // back in through the older duplicate fields on the master review.
    record.excerpts = {};
    record.excerpt = '';
  }
  const ordered = excerpts
    .filter((i) => live(i) && i.fieldData?.available === true)
    .sort(
      (a, b) =>
        rank(a.fieldData.rank) - rank(b.fieldData.rank) ||
        String(a.createdOn).localeCompare(String(b.createdOn)) ||
        a.id.localeCompare(b.id),
    );
  for (const item of ordered) {
    const f = item.fieldData,
      record = byMaster.get(f.review);
    const topic =
      byTag.get(f['ranking-topic']) ||
      (f['static-context'] === 'bad77103bddf98259c82293bdfc4deb4' ? 'general' : '');
    if (!record || !topic || typeof f.excerpt !== 'string' || !f.excerpt.trim()) continue;
    if (f.excerpt.length > 5000) throw Error('invalid_review_excerpt');
    if (Object.hasOwn(record.snippetRanks, topic)) continue;
    record.snippetRanks[topic] = rank(f.rank);
    if (topic === 'general') record.excerpt = f.excerpt.trim();
    else record.excerpts[topic] = f.excerpt.trim();
    const evidence = (Array.isArray(f.topics) ? f.topics : [])
      .map((id) => byTag.get(id))
      .filter(Boolean);
    record.topics = [
      ...new Set([...record.topics, ...evidence, ...(topic === 'general' ? [] : [topic])]),
    ];
  }
  const servicePaths = new Map(
    services.filter(live).map((i) => [i.id, safePath('/services/' + i.fieldData.slug)]),
  );
  const treatmentPaths = new Map(
    treatments.filter(live).map((i) => [i.id, safePath('/treatments/' + i.fieldData.slug)]),
  );
  const plans = [];
  for (const item of contexts.filter((i) => live(i) && i.fieldData?.active === true)) {
    const f = item.fieldData;
    if (!safeKey(f.slug)) throw Error('invalid_review_context');
    const paths = [
      safePath(f['page-path']),
      servicePaths.get(f.service),
      treatmentPaths.get(f.treatment),
    ].filter(Boolean);
    // Area pages inherit their referenced treatment, never a guessed URL substring.
    if (f.treatment)
      for (const area of areas.filter(live)) {
        if (area.fieldData.treatment === f.treatment)
          paths.push(safePath('/areas/' + area.fieldData.slug));
      }
    const topics = [
      ...new Set((f['primary-topics'] || []).map((id) => byTag.get(id)).filter(Boolean)),
    ];
    plans.push({
      id: f.slug,
      paths: [...new Set(paths.filter(Boolean))],
      topics: topics.length ? topics : ['general'],
    });
  }
  const claimed = new Map();
  for (const plan of plans)
    for (const p of plan.paths) {
      if (claimed.has(p) && claimed.get(p) !== plan.id) throw Error('ambiguous_review_context');
      claimed.set(p, plan.id);
    }
  return plans;
}
