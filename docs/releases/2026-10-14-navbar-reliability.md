# Navbar reliability and legacy-consumer audit

## Scope

Based on the staging ownership release d3f537204e1db498f68365537eb339fd015f1d55.
Keep Designer layout, native Webflow interactions, shared scroll lock and deferred enhancement ownership.

## Changes

- NavbarState 1.1.0 exposes one DOM-readiness helper for the loader and mobile lock.
- NavbarLoader 2.0.2 supports registration and activation arriving in either order.
- Scheduling rejections and synchronous exceptions release the queued flag; failed upgrades restore native duration 0 and retry on navbar interaction or online recovery.
- Successful upgrades remove retry listeners. A cancelled runtime does not create a retry loop.
- Mobile navigation refreshes its lock when a late consent bundle finishes loading; no second shared-lock implementation is added.
- Remove the unused Finsweet fallback from the current early bundle.

## Consumer evidence

The audit fetched 54 published URLs: all 28 non-draft static/utility paths plus 26 distinct homepage-linked Services, Treatments, Areas and Blog paths. Every response was HTTP 200. Every active fs-scrolldisable-element hook was smart-nav on a data-tdb-navbar-native navbar. No unhandled or independent consumer was found.
Designer also contains the old Navbar definition with a smart-nav hook, but its instance count is zero. Navbar New has 17 Designer placements. Its hook is handled by the shared mobile lock; the legacy attribute does not require the external library.
The audit is of the published URLs listed by tools/audit-navbar-consumers.cjs, not every historical CMS item or unpublished draft.

## Verification

Focused regression tests cover DOM readiness, both registration orders, rejected/thrown scheduling, failed installation, cancellation, open-menu handoff, late shared-lock arrival and BFCache restoration. Existing consent tests cover new/saved accept/reject, failed stylesheet loading, failed enhancement exports and destroyed-runtime cancellation.
Staging browser checks cover mobile open/close, Services disclosure, desktop Discover, Escape closing and scroll-lock release. A fresh load showed opacity 1 before enhancement. Scroll-responsive hide/show remains deferred by design.

## Rollback

Original staging loader pin: d3f537204e1db498f68365537eb339fd015f1d55/dist/tdb-navbar-loader.js.
Initial verified reliability pin before removing Finsweet: af88a1457e66a8e96453b9b30fdc94f224d0520f/dist/tdb-navbar-loader.js.
Restore either immutable loader URL in the global footer and publish only the Webflow subdomain. Other asset pins are unchanged.
