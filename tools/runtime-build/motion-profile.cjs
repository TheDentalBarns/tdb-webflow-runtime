/* Build-time source of truth for the JS profile and its native CSS tokens. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
function readProfile() {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config/motion.json'), 'utf8'));
  for (const profile of [config, ...Object.values(config.families || {})]) {
    if (!Number.isFinite(profile.pace) || profile.pace < 0.5 || profile.pace > 2)
      throw Error('Motion pace must be between 0.5 and 2.');
    if (!Object.hasOwn(config.characters, profile.character))
      throw Error('Unknown motion character.');
  }
  return config;
}
function css(config = readProfile()) {
  const curves = Object.entries(config.characters[config.character])
    .filter(([role]) => role !== 'fade' || !config.families?.fade)
    .map(([role, value]) => `  --tdb-motion-ease-${role}: ${value};`);
  const families = config.families || {};
  const familyTokens = ['navigation', 'accordion', 'fade'].map(
    (name) => `  --tdb-${name}-pace: ${(families[name] || config).pace};`,
  );
  for (const name of ['navigation', 'accordion', 'fade'])
    for (const role of ['travel', 'panel', 'release', 'fade', 'control'])
      familyTokens.push(
        `  --tdb-${name}-ease-${role}: ${config.characters[(families[name] || config).character][role] || 'initial'};`,
      );
  if (families.fade)
    familyTokens.push(
      `  --tdb-motion-ease-fade: ${config.characters[families.fade.character].fade || 'initial'};`,
    );
  const scoped = (name, selector) => {
    if (!families[name]) return '';
    const family = families[name],
      palette = config.characters[family.character];
    return (
      `\n${selector} {\n  --tdb-motion-pace: var(--tdb-${name}-pace);\n` +
      ['travel', 'panel', 'release', 'fade', 'control']
        .map((role) => `  --tdb-motion-ease-${role}: ${palette[role] || 'initial'};`)
        .join('\n') +
      (name === 'accordion'
        ? '\n  --tdb-reveal-fade-in: calc(300ms * var(--tdb-accordion-pace));\n  --tdb-reveal-move-in: calc(400ms * var(--tdb-accordion-pace));\n  --tdb-reveal-out: calc(200ms * var(--tdb-accordion-pace));\n  --tdb-reveal-ease: var(--tdb-motion-ease-control,cubic-bezier(.165,.84,.44,1));'
        : '') +
      '\n}\n'
    );
  };
  return (
    '/* Generated from config/motion.json. Change pace/character there. */\nhtml {\n' +
    `  --tdb-motion-pace: ${config.pace};\n` +
    [...curves, ...familyTokens].join('\n') +
    '\n}\n' +
    scoped('navigation', ':where(.navbar10_component,.navbar-bg_layer)') +
    scoped('accordion', ':where([data-tdb-disclosure-item])')
  );
}
function writeCSS() {
  fs.writeFileSync(path.join(root, 'src/styles/tdb-motion-profile.css'), css());
}
if (require.main === module) writeCSS();
module.exports = { readProfile, css, writeCSS };
