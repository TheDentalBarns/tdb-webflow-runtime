# Calculator drawer navigation motion

Opening the investment calculator applied the inline calculator's important CSS transforms and acquired the shared drawer's Web Animations at the same time. The important transforms overrode the drawer animation, so the top navigation and bottom VIP bar jumped directly offscreen on treatment and service pages.

Drawer views now retain their local calculator focus while the shared drawer exclusively owns bar motion. Inline calculator focus and its scroll policy are unchanged. The review badge follows the calculator drawer's existing open/hidden state, retaining its previous dismissal behavior throughout the drawer close.

The regression check covers transfer from an active inline calculator, both page chrome policies, and restoring inline focus after dismissal. Browser validation samples the actual bar positions during calculator opening on mobile and desktop; the previous release had no intermediate positions. The change uses the existing 420ms navigation clock and easing.

Base release: `af745258ba114c0f2893f2bed809d085276f6226`. Publish to Webflow staging only. Evidence is stored in the workspace's `calculator-nav-motion-20261111` directory.
