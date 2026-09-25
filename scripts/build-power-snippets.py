from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
css = (root / "src/reviews/power-snippets.css").read_text()
js = (root / "src/reviews/power-snippets.js").read_text()
(root / "dist/tdb-power-snippets.css").write_text(css)
(root / "dist/tdb-power-snippets.js").write_text(js.replace("__CRITICAL_CSS__", json.dumps(css)))

css = (root / "src/reviews/review-drawer.css").read_text()
js = (root / "src/reviews/review-drawer.js").read_text()
(root / "dist/tdb-review-drawer.css").write_text(css)
(root / "dist/tdb-review-drawer.js").write_text(js.replace("__DRAWER_CSS__", json.dumps(css)))

css = (root / "src/reviews/embedded-reviews.css").read_text()
(root / "dist/tdb-embedded-reviews.css").write_text(css)
js = (root / "src/reviews/embedded-reviews.js").read_text()
(root / "dist/tdb-embedded-reviews.js").write_text(js.replace("__EMBEDDED_CSS__", json.dumps(css)))
