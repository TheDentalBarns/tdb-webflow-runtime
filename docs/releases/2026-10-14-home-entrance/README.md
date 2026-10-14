# Home entrance reconciliation

Home page 677cf86df9952f978d94d8a9; staging only.

The essential UI animation reset suppressed the Home nav entrance. Keep the page-owned entrance explicitly protected, matching the existing Vimeo controls. Timing stays 100ms delay plus 200ms ease-out.

The poster previously relied on a forwards-filled animation to stay visible. Playback removed that animation and exposed native opacity:0. Reconcile the states: give the pre-playback poster a real opacity:1 and use backwards fill for the 100ms entrance delay only. The shared entrance keyframes now explicitly start at zero. Once entrance finishes, the animation relinquishes opacity. Playback's existing CSS can transition the actual base value from 1 to 0 using the Designer-owned 450ms transition.

Removed the temporary poster exit keyframes and duplicate 450ms timing. Existing Vimeo JS, consent, playback readiness and 520ms removal remain unchanged.

Apply head.html as complete Home head code; head-before.html is the pre-fix rollback.
