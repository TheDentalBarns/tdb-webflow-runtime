from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
css = (root / "src/reviews/power-snippets.css").read_text()
js = (root / "src/reviews/power-snippets.js").read_text()
(root / "dist/tdb-power-snippets.css").write_text(css)
icons = (root / "src/reviews/platform-icons.json").read_text()
(root / "dist/tdb-power-snippets.js").write_text(js.replace("__CRITICAL_CSS__", json.dumps(css)).replace("__PLATFORM_ICONS__", icons))

css = (root / "src/reviews/review-drawer.css").read_text()
js = (root / "src/reviews/review-drawer.js").read_text()
(root / "dist/tdb-review-drawer.css").write_text(css)
(root / "dist/tdb-review-drawer.js").write_text(js.replace("__DRAWER_CSS__", json.dumps(css)))

css = (root / "src/reviews/embedded-reviews.css").read_text()
(root / "dist/tdb-embedded-reviews.css").write_text(css)
js = (root / "src/reviews/embedded-reviews.js").read_text()
(root / "dist/tdb-embedded-reviews.js").write_text(js.replace("__EMBEDDED_CSS__", json.dumps(css)))

shared = (root / "src/reviews/power-snippets.css").read_text().split(".tdb-review-carousel{", 1)[1]
css = ".tdb-review-carousel{" + shared
css += "\n.tdb-review-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}\n"
css += (root / "src/reviews/team-quotes.css").read_text()
js = (root / "src/reviews/team-quotes.js").read_text()
(root / "dist/tdb-team-quotes.css").write_text(css)
(root / "dist/tdb-team-quotes.js").write_text(js.replace("__TEAM_QUOTES_CSS__", json.dumps(css)))
