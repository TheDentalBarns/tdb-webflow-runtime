const fs = require('fs'),
  path = require('path');
const root = path.resolve(__dirname, '../..'),
  postcss = require('postcss');
const manifest = require(path.join(root, 'config/page-layout-css.json')),
  source = fs.readFileSync(path.join(root, 'src/styles/secondary-layouts.css'), 'utf8');
for (const bundle of manifest.bundles) {
  const css = postcss.parse(source);
  css.walkRules((r) => {
    const selectors = postcss.list
      .comma(r.selector)
      .filter(
        (s) => bundle.families.some((f) => s.startsWith('.' + f)) || bundle.selectors?.includes(s),
      );
    if (selectors.length) r.selector = selectors.join(',');
    else r.remove();
  });
  css.walkAtRules((r) => {
    if (!r.nodes?.length) r.remove();
  });
  fs.writeFileSync(path.join(root, bundle.file), css.toString());
}
