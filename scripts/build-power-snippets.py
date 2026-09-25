from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
css = (root / "src/reviews/power-snippets.css").read_text()
js = (root / "src/reviews/power-snippets.js").read_text()
(root / "dist/tdb-power-snippets.css").write_text(css)
(root / "dist/tdb-power-snippets.js").write_text(js.replace("__CRITICAL_CSS__", json.dumps(css)))
