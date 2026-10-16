import { partnerImages } from './partner-images.mjs';
export const PARTNER_COLLECTION = '678a902a99de45047eca20cf';
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
