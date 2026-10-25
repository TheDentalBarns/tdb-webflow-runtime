/* Build-time release coverage. This never runs in the browser or selects asset URLs. */
const fs = require('node:fs');
const path = require('node:path');
const { minify } = require('terser');

async function assetReferences(source) {
  // Parse and strip comments without executing source or changing its string literals.
  const { code } = await minify(source, {
    compress: false,
    mangle: false,
    format: { comments: false },
  });
  return new Set(
    [...code.matchAll(/['"`]((?:dist\/)?tdb-[a-z0-9.-]+\.(?:js|css))['"`]/g)].map(
      (match) => 'dist/' + match[1].replace(/^dist\//, ''),
    ),
  );
}

async function auditRelease({ release, targets, read }) {
  const errors = [];
  const groups = ['javascript', 'styles', 'assets', 'compatibilityOnly'];
  const declared = new Map();
  for (const group of groups)
    for (const asset of release[group] || []) {
      if (declared.has(asset)) errors.push(`${asset} is classified more than once`);
      declared.set(asset, group);
    }
  // Start with the independent build manifest, not the list whose completeness we test.
  for (const output of Object.keys(targets))
    if (!['javascript', 'compatibilityOnly'].includes(declared.get(output)))
      errors.push(`Unclassified JavaScript build target: ${output}`);

  const activeSources = new Set(release.javascript.flatMap((output) => targets[output] || []));
  const references = new Map();
  for (const source of activeSources) {
    const assets = await assetReferences(read(source));
    references.set(source, assets);
    for (const asset of assets) {
      const group = declared.get(asset);
      if (!group) errors.push(`${source} references undeclared asset ${asset}`);
      else if (group === 'compatibilityOnly') {
        const fallback = release.compatibilityFallbacks?.[asset];
        if (!fallback?.reason?.trim() || !fallback.sources?.includes(source))
          errors.push(`${source} references unclassified compatibility fallback ${asset}`);
      }
    }
  }
  for (const [asset, fallback] of Object.entries(release.compatibilityFallbacks || {})) {
    if (declared.get(asset) !== 'compatibilityOnly')
      errors.push(`Compatibility fallback is not compatibilityOnly: ${asset}`);
    if (!fallback.reason?.trim() || !fallback.sources?.length)
      errors.push(`Compatibility fallback needs a reason and sources: ${asset}`);
    for (const source of fallback.sources || [])
      if (!references.get(source)?.has(asset))
        errors.push(`Stale compatibility fallback: ${source} -> ${asset}`);
  }
  return { errors, references };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  auditRelease({
    release: require('../../config/release.json'),
    targets: require('./targets.cjs'),
    read: (file) => fs.readFileSync(path.join(root, file), 'utf8'),
  })
    .then(({ errors }) => {
      if (errors.length) throw Error(errors.join('\n'));
      console.log('Release covers JavaScript build targets and active literal JS/CSS references');
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { assetReferences, auditRelease };
