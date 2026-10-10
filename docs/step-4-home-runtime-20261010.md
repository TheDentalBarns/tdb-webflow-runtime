# Step 4: homepage runtime cleanup

Scope: staging only. Preserve Home motion, native layout, consent gates, controls,
and the current per-file runtime pins. Other-page legacy migrations remain deferred.

## Runtime changes

- `tdb-usp-loader.js` now requests its existing adapter only after finding a
  native `[data-tdb-usp]` component. A narrow child-list observer supports late
  insertion and disconnects once found. Present components retain immediate
  adapter loading and their existing 500px dependency warm-up.
- The fallback adapter URL and shared registry resolution are unchanged. Home
  retains its `7e1cea4365e1b6ef686295b054bf8469578c3d83` adapter; standard pages
  retain `3217122904abee907bac1af3c23c28320e421219` when the feature is present.
- Current shared UI sources were aligned with the deployed `72e85fc8...` files
  before editing; the branch ancestor contained older versions. Source alignment
  itself introduces no published change.
- Five obsolete Elfsight widget rules and two obsolete alternatives in one
  selector group were removed. The native announcement's legacy-named shell,
  its ID, shared bar timing and all active rules remain intact. No matches for
  the retired elements existed in the 192-document audit or live Home checks.
- `src/styles/tdb-ui.css` stays readable; its `dist` copy uses pinned CleanCSS
  5.3.3 at level 0, without URL rebasing. There are no new head CSS overrides.

## Build correction

`tools/runtime-build/targets.cjs` is the shared source-to-output manifest.
The runtime workflow now uses the same builder as local releases, including
all six footer source modules instead of compiling only `site-asset-loader.js`.
Its change triggers cover those sources and the build tools. UI workflow inputs
now include the current chrome-motion/control-effects sources and pinned tools.

These workflow changes are on this release branch. They are not a claim that
the default branch was merged or a hosted CI run was executed. The existing
footer runtime pin is unchanged; a local rebuilt footer matched its branch
artifact byte-for-byte.

## Reproduce the changed assets

```sh
npm ci --prefix tools/runtime-build --ignore-scripts --no-audit --no-fund
node tools/runtime-build/build-preservation.cjs dist/tdb-usp-loader.js
python tools/build-ui.py --global-only
node tools/runtime-build/verify-ui.cjs
node --test tests/usp-loader-presence.test.cjs
TDB_USP_TEST_ARTIFACT=dist node --test tests/usp-loader-presence.test.cjs
```

The six cases cover present/absent components, direct/nested late insertion,
an already initialized adapter, and load failure without a retry loop.

Only the existing site-head UI stylesheet pin (including its noscript copy)
and the site-footer USP loader pin should change in Webflow. Do not update the
whole runtime base or move unrelated modules to this commit.

## Measured asset sizes

| Asset | Before | After | Raw saving | Local gzip-9 saving |
|---|---:|---:|---:|---:|
| Shared UI CSS | 18,255 B | 15,370 B | 2,885 B | 381 B |
| USP loader | 282 B | 595 B | -313 B | -181 B |
| Home net | | | 2,572 B | 200 B |

Home uses the USP adapter, so no adapter request is removed there. An eligible
feature-free page additionally avoids the standard 6,159-byte adapter and one
request. These are asset-size and request-graph findings, not a measured LCP,
INP or total-page transfer improvement.

The homepage already excludes the legacy Instagram feed and page-compat CSS;
those files must remain available for other page families. Quote/Vimeo runtime
and UI have active homepage consumers. Further splitting them is not part of
this bounded release.

## Rollback

- UI stylesheet: `72e85fc8b5f0d4311db1302df3c2b0af4ac2b965/dist/tdb-ui.css?announcement-native=1`
- USP loader: `996e193a99b2f2f8a1ef43b80e064802ae0708b1/dist/tdb-usp-loader.js`

Restore only those references and republish staging if needed. Production
publishing remains separately authorized.
