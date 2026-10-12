/* Formatting-only minification of the readable motion source: no compression
 * transforms or identifier mangling; preserve animation behaviour exactly. */
const fs = require('node:fs');
const path = require('node:path');
const {minify} = require('terser');
const root = path.resolve(__dirname, '../..');
(async () => {
  const source = fs.readFileSync(path.join(root, 'src/shared/motion.js'), 'utf8');
  const result = await minify(source, {compress:false, mangle:false, format:{comments:false}});
  if (!result.code) throw new Error('Empty motion build');
  fs.writeFileSync(path.join(root, 'dist/tdb-motion.js'), result.code + '\n');
})();
