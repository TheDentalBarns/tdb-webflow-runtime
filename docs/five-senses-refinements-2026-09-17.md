# Five Senses 0.9.0 — staging refinement

- Extended the premium chair upholstery mask to its outer left seam and seat edge, with a 2px contour stroke and 0.6px feather.
- Grade headphones, Aesop bottle and candle according to Sight. Cold headphones remain cool with either chair material.
- Controls use their original bottom inset. Headphones move 70 source pixels right and 70 up.
- Every OFF request carries its activated sense through the pending queue and contracts the outgoing scene into that control.
- Normal reveals are 600ms ON / 400ms OFF. Sound ON keeps two pulses, now 175ms apart; clinical audio reaches silence at 150ms, calm audio rises from 175ms to 775ms. Sound OFF switches audio immediately and uses one contracting ring.
- Objects are revealed solely by the scene's circular mask. Removed all independent object-opacity arrival fades.
- Smell adds a brown glass candle to the left of the sink.
- Taste OFF shows a white clinical dispenser and yellow sharps container in the Aesop position. Taste ON replaces both with Aesop. Updated the clinical plate to remove its old baked-in sharps bin.

## Assets

Created with the built-in image-generation tool, then cropped to the nontransparent bounds where applicable and converted to WebP. No original asset was overwritten.

- `assets/five-senses/scent-candle.webp`: photorealistic isolated brown amber glass candle, ivory wax, small flame, no label, transparent background, soft daylight from left, slightly elevated view.
- `assets/five-senses/taste-clinical.webp`: photorealistic transparent pair of a white pump dispenser and yellow sharps container, no text or brand, matching viewpoint and left daylight.
- `assets/five-senses/surgery-clinical-clean.webp`: image edit of the existing registered clinical plate. Prompt requested removal only of the upper-right yellow sharps bin, reflection and shadow, retaining framing, chair, cabinets, floor, tap, sink and lighting. The original plate remains available at its previous Webflow asset URL.

## Validation before publication

`node tools/five-senses/build.mjs`, `node tools/five-senses/check.mjs`, and `git diff --check` passed. Checks cover all five OFF directions, sound silence ordering and immediate reversal, circle endpoint cleanup, rapid pending requests, viewport coverage, and closing during audio decode. Rendered warm/cold combinations were inspected against the source photographs before publication.
