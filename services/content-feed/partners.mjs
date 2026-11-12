import { partnerImages } from './partner-images.mjs';
export const PARTNER_COLLECTION = '678a902a99de45047eca20cf';
export const BLOG_COLLECTION = '67837ee84466866251245eb4';
export const PRESS_CATEGORY = 'c318fb8e5619f882f4679f8c48a99121';
const invalid = () => {
  throw Error('invalid_partner_data');
};
function text(value, max) {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max) invalid();
  return value.trim();
}
function url(value, image = false) {
  if (!value) return '';
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port) invalid();
  if (
    image &&
    (u.hostname !== 'cdn.prod.website-files.com' ||
      !u.pathname.startsWith('/67837ee85ee175873126e461/'))
  )
    invalid();
  return u.href;
}
export function projectPartners(items) {
  const partners = [],
    seen = new Set();
  for (const item of items) {
    const f = item.fieldData;
    if (item.isArchived || !item.lastPublished || !f?.paragraph || !f.logo?.url || !f.image?.url)
      continue;
    const id = text(item.id, 80),
      slug = text(f.slug, 256);
    if (!id || !slug || seen.has(id)) invalid();
    seen.add(id);
    partners.push({
      id,
      slug,
      name: text(f.name, 256),
      body: text(f.paragraph, 20000),
      logo: url(f.logo.url, true),
      image: url(f.image.url, true),
      variants: partnerImages[url(f.image.url, true)] || [],
      imageAlt: text(f.image.alt, 1000),
      link: url(f.link),
    });
  }
  return { partners };
}

// The v2 route joins published CMS references. The legacy route stays unchanged
// until the corresponding frontend release is published on a custom domain.
export function projectPartnerArticles(items, blogItems) {
  if (!Array.isArray(items) || !Array.isArray(blogItems)) invalid();
  const blogs = new Map();
  for (const item of blogItems) {
    if (item.isArchived || !item.lastPublished) continue;
    const id = text(item.id, 80);
    if (!id || blogs.has(id)) invalid();
    blogs.set(id, item);
  }
  const { partners } = projectPartners(
    items.filter((item) => item.fieldData?.category !== PRESS_CATEGORY),
  );
  const seen = new Set(partners.map((partner) => partner.id));
  for (const item of items) {
    const f = item.fieldData;
    if (f?.category !== PRESS_CATEGORY || item.isArchived || !item.lastPublished || !f.logo?.url)
      continue;
    const id = text(item.id, 80),
      slug = text(f.slug, 256);
    if (!id || !slug || seen.has(id)) invalid();
    seen.add(id);
    const refs = f['related-articles'] || [];
    if (!Array.isArray(refs) || refs.length > 1000 || refs.some((ref) => !text(ref, 80))) invalid();
    const selected = [...new Set(refs)].map((ref) => blogs.get(ref)).filter(Boolean);
    selected.sort((a, b) => (Date.parse(b.createdOn) || 0) - (Date.parse(a.createdOn) || 0));
    const articles = selected.map((post) => {
      const title = text(post.fieldData?.name, 1000),
        postSlug = text(post.fieldData?.slug, 256);
      if (!title || !postSlug || /[\\/\s?#]/.test(postSlug) || ['.', '..'].includes(postSlug))
        invalid();
      return { id: text(post.id, 80), title, path: '/post/' + encodeURIComponent(postSlug) };
    });
    const latest = selected[0]?.fieldData;
    const image = latest?.['thumbnail-image']?.url
      ? latest['thumbnail-image']
      : latest?.['main-image']?.url
        ? latest['main-image']
        : f.logo;
    const imageURL = url(image.url, true);
    partners.push({
      id,
      slug,
      name: text(f.name, 256),
      body: '',
      logo: url(f.logo.url, true),
      image: imageURL,
      variants: partnerImages[imageURL] || [],
      imageAlt: text(image.alt || latest?.['main-image-alt-text'] || latest?.name || f.name, 1000),
      link: url(f.link),
      articles,
    });
  }
  return { partners };
}
