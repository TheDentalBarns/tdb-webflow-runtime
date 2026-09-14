# Parallax touch feedback: scroll fade, 14 September 2026

This revision supersedes docs/parallax-touch-hold-staging-2026-09-14.md. User preference: hold white after touch and on Back; fade to usual dark glass when scrolling. The page-exit visual reset and transition suppression have been removed.

Existing prepareParallaxCTA owns touch feedback. The held class survives pagehide/pageshow. Those lifecycle events clear only scroll intent so restored positions cannot clear the highlight. Touch pointerdown or wheel arms the passive window scroll handler; actual scroll removes the held class. Pointer cancellation and keyboard input clear feedback too. All listeners are removed on destroy. No new dependencies, polling, timers or CMS requests.

CSS keeps explicit white held state and dark rgba(0,0,0,.3) resting state, with a single uninterrupted 300ms background/colour/border transition. Native touch hover cannot expose the generic white Webflow rule. The 20px backdrop blur stays defined throughout. Existing mouse hover, keyboard focus and CMS link sync remain.

Validation before release: ten focused tests passed, covering Home/Location release and cached lifecycle events, restored scroll, subsequent gesture/scroll, cancellation, wheel, keyboard, disabled state, cleanup, existing CMS link behavior and CSS transition/blur declarations. These simulate lifecycle events; they do not verify physical mobile rendering or actual Back-cache timing. Physical phone visual check remains outstanding.

Slider JS/CSS pin: 17ee4abe875ce8acf959f584628ab04cc3fada3b
Footer pin: cbb59b04c9a38e957de8a32c1bf8290bd5cad0a5
Immediate v0.8.24-parallax-scroll-fade-staging: the release commit containing this document.
Scope: Webflow staging only, Home and Location enhanced parallax CTAs. Production publication is not authorized.

Rollback: replace this immediate release pin in the current Webflow footer with b0264d4af2946b4153cb9066bab8af604baace9d (previous held-state release), preserving unrelated code; reconcile comments with previous footer 73ccf1769e2828620765c14b448be24f1213a116 and slider e12db5658189b11ff59c759a0d2194c5127ad83b; publish only Webflow subdomain with customDomains empty.
