/* Build-time source of truth for the JS profile and its native CSS tokens. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
function readProfile() {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'config/motion.json'), 'utf8'));
  if (!Number.isFinite(config.pace) || config.pace < 0.5 || config.pace > 2)
    throw Error('Motion pace must be between 0.5 and 2.');
  if (!Object.hasOwn(config.characters, config.character)) throw Error('Unknown motion character.');
  return config;
}
function css(config = readProfile()) {
  const curves = Object.entries(config.characters[config.character]).map(
    ([role, value]) => `  --tdb-motion-ease-${role}: ${value};`,
  );
  return (
    '/* Generated from config/motion.json. Change pace/character there. */\nhtml {\n' +
    `  --tdb-motion-pace: ${config.pace};\n` +
    curves.join('\n') +
    '\n}\n'
  );
}
function writeCSS() {
  fs.writeFileSync(path.join(root, 'src/styles/tdb-motion-profile.css'), css());
}
if (require.main === module) writeCSS();
module.exports = { readProfile, css, writeCSS };
