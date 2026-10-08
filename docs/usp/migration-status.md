# USP native drawer migration — 8 October 2026

Runtime source: `src/usp/drawer.js`, artifact `dist/tdb-usp-drawer.js` v2.0.0.
Native component USP Drawer: b0e9aba4-e002-1e83-1542-b8a3ea2bdecb.
Nested in Drawer Shell instance cd5381d0-5d0c-07f8-b04f-b9b49009c052 inside Banner USP e8cfdb6d-70d6-91f6-b23a-b312e7cea027.

Shared TDBDrawer, TDBSwiper, TDBMotion and TDBNativeTicker are loaded through the current module registry. No CSS is injected. No replacement drawer controls are created in JavaScript. Five bound content sources remain native in Banner USP; the adapter clones the native slide template and binds the existing content at runtime.

Local Chromium checks passed at desktop, tablet, phone and phone landscape sizes: open/close, direct topic entry, next/previous, wrap, mouse drag, rapid navigation, scroll memory, focus trap, Escape, focus return and overflow restoration. Staging verification is still required. No production publishing authorized.

## Deployment blocked

Automatic approval review rejected pushing the implementation and Designer snapshots to the existing public GitHub repository pending explicit authorization to disclose that payload there. Do not retry this upload via another tool without user approval.

The code is committed locally on cleanup/usp-native-20261008; no remote push succeeded and no staging publish was performed in this task.

Designer compatibility while blocked:
- New tdb-usp_launch controls have display:none; old runtime still creates its own controls.
- Five source wrappers retain modal1_component alongside tdb-usp_source so old runtime can still read them.
- Old close/backdrop nodes and Finsweet hooks were removed; they were already unused by the external drawer.
- New shared drawer remains hidden by default.

After explicit approval:
1. Upload this branch and verify its immutable CDN asset.
2. Set native tdb-usp_launch display:flex.
3. Remove modal1_component from source wrappers (use global tdb-usp_source).
4. Re-read current site footer and replace only the USP script URL/comment with the new immutable SHA; preserve concurrent changes.
5. Publish only Webflow staging, verify actual native CSS, content bindings, responsive layout and behaviour.
6. IX2 action list deletion has no supported tool. Legacy USP targets are gone; inspect remaining Modal 1 action-list consumers before manual deletion.
