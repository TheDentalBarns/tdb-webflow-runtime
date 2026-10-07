# Treatment hero parallax migration

Treatment Hero component: 5c82cd7c-1ecc-0283-465a-5ae093d8c7bd.
Wrapper 5c82cd7c-1ecc-0283-465a-5ae093d8c7ca;
image 5c82cd7c-1ecc-0283-465a-5ae093d8c7cc.
Area Treatment Hero component: 93ee77ca-b301-5145-6d96-011342126936.
Wrapper 93ee77ca-b301-5145-6d96-011342126942;
image 93ee77ca-b301-5145-6d96-011342126944.

Both wrappers now carry data-tdb-page-break="treatment-hero",
data-tdb-parallax-from="0vh" and data-tdb-parallax-to="4vh". Both images have
data-tdb-page-break-image and use tdb-treatment-parallax-image
(style 2449b537-3223-87d2-ae44-7c7e808ab1f9), replacing header137_image1.
This removes the old global IX2 selector match without runtime class surgery.
The existing loader, controller and memory own the movement; no new runtime,
script or release pin was introduced. There is no opacity animation.

The authored movement stays 0 to +4vh. The old 50–100% image-progress interval
is replaced by full stationary-wrapper progress with the shared first-paint
retention and scroll-only catch-up. Visible images do not jump on mount/reload;
offscreen images align to the curve. Motion starts with user scrolling.

Native layout is copied exactly from the old image class: desktop width100%,
height/max-height110vh, cover, overflow hidden; medium aspect-ratio4/5,
min-width100%, height auto, min-height125vw, max-height none; tiny aspect-ratio4/5,
height auto, min-height55vh, max-height none. Existing wrapper alignment and
sizes remain, including bottom alignment on phones.
The Treatment Hero Light variant def157e1-2faf-62e3-ef2e-72dee1b9d7c9 overrides
were copied to the new class: main width/min-width100%, max-width none, height
auto, min-height110vh/max-height none; tiny width/min-width100%, max-width none,
min-height55vh. No extra crop or vertical offset was introduced.
Image prop 82c66605-2e19-c355-2e6f-b676ab674f9e, inherited alt text and fetchpriority
high are retained. Overlay, content and bindings remain native.

IX2 a-63 Treatment Hero Animation targets the two component images above.
a-80 Treatment Hero Animation 2 targets legacy element
699058c919f4a1adcc157cb3|200e0999-cb6c-6125-428b-dd992f56b808, confirmed absent
by exact query and full current Area Treatment template tree. Both definitions
can be deleted manually in Designer after review.

Staging checks: /treatments/invisalign and /areas/sutton-coldfield-invisalign
contain the controller marker and no old header137_image1 class. Browser
fixtures using their published native HTML/CSS passed at 1440x900, 834x1112,
667x375 and 390x844: native wrapper/image dimensions unchanged; no idle startup
movement; scrolling/reversal with crop coverage; reload offset retained;
positive endpoint exactly4vh. Production domains were not published.

Rollback: restore header137_image1 on the two images and remove the three
wrapper attributes plus image marker. Old IX2 definitions remain until manual
cleanup. Remove new unused styles separately only after rollback confirmation.
