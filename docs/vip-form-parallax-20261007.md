# VIP form background migration

Both native form components now share the existing TDBMotion pageBreaks controller:

- vip footer form: 2977f693-4e1e-3867-a945-4c09f58fd013
  wrapper 2977f693-4e1e-3867-a945-4c09f58fd022, image ...fd024.
- vip form light: f54a8db1-e3a3-18ca-d164-71b9604e1fea
  wrapper f54a8db1-e3a3-18ca-d164-71b9604e1ff1, image ...e1ff3.

Wrappers carry data-tdb-page-break="vip-form", data-tdb-parallax-from="-5%"
and data-tdb-parallax-to="5%". Each image has data-tdb-page-break-image.
These preserve a-30 VIP BG Parallax's image-relative travel. There is no fade.
The existing stationary wrapper supplies scroll progress, using the shared
first-paint retention, scroll catch-up and reload memory. No runtime or loader
change and no release-pin changes were needed.

Native image class tdb-vip-form-parallax-image (fff07e13-2235-6d80-a950-81af78672289)
replaces header69_background-image on these two images, eliminating the old IX2
child-selector match. The class is absolute, left/right 0%, top -10%, width 100%,
height 120%, object-fit cover and object-position 50% 50%. The image has 10% of
wrapper height overscan per edge, exceeding the 6% required by 5% of image height.
The old native class had this overscan only at >=1920px and <=479px, and 100%
height/top 0 at other breakpoints. This migration makes coverage consistent;
it increases the crop at those intermediate widths. Layout remains native.

Photo asset 696a3cd828033c589019ed7f, alt text/inheritance, overlay, form fields,
submission wiring and section dimensions are unchanged.

IX2 a-30 has two component-wrapper targets above and six old VIP-template
handles. All six old handles are absent from the current VIP template tree;
that template now uses vip form light. After staging validation, VIP BG Parallax
can be deleted manually in Designer. Other VIP hero interactions are separate.

Rollback: restore header69_background-image on both images and remove the
three wrapper attributes plus image marker. The old IX2 definition is retained
until the user's manual cleanup.

Validation: fetched staging Home, VIP become-a-patient and First Visit all have
controller markers and no exact old header69_background-image class. Browser
fixtures using the published native HTML/CSS tested both form variants at
1440x900, 834x1112, 667x375 and 390x844: both travel endpoints, coverage through
scroll/reversal, position retention on reload and no idle drift passed. Form
markup and photo URLs match the pre-migration published sections. No form was
submitted. Production domains were not published.
