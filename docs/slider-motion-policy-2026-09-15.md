# Slider motion policy — 15 September 2026

Owner explicitly requested overriding reduced motion for everyone for highlight first-view advance and slider-focus nav/VIP/Elfsight transitions. Removed the highlight first-view media-query veto and slider-focus CSS reduced-motion block. Other reduced-motion policies remain unchanged. No new requests or inline patches.

36 deterministic first-view checks pass, including reduced-motion startup/change, intent cancellation, once-only advance, and unchanged parallax controller. Updated legacy harness for current readiness/loop-card behavior. Physical-device appearance is not certified by these tests.

Assets: 48124a90eddd39bf4ae611d00b9fe80583b98872. Footer: 7eb996eaaf0bb335ec3578f3e6f5e147995fdc64. Staging only.

Rollback global UI pin to 2f8ff525fc254a7524d42bf6b12db5f3e8c4d59f and immediate pin to d05960427433fb20d32a0762eff2253b1c270f96; reconcile manifest footer to c770bfe8d55cfb9af9928ca66b2ff4d347742ea1 and slider to 9280e180bb887553f2ad59829b990212b7c2eaa1. Preserve all unrelated head/page edits.
