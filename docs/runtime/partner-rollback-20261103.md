# Restore the partner marquee before today's touch changes

The user rejected the `2816e790f2263ecb573cb19dc24ffd239e23458b`
synchronisation trial after physical-phone testing and reported the marquee
was substantially better before today's changes. Restore its previous
behaviour without further timing or interaction changes.

Restore source, loader and interaction tests from
`f9f8c90ddc5c219c0e2200a1a2d731f274441af0` (marquee 0.15.4).
Remove the partner-specific touch-action rules added today. Keep the map
input's 16px floor, map focus behaviour, shared focus owner checks, review
badge focus CSS, Home paint guard and accepted motion settings.

After rebuilding, the marquee distribution is byte-for-byte identical to
the pre-touch release: Git blob `5dd31bc53d65123a31a44ef5ab0c3ba261419e8c`.
The restored source and loader also match their baseline Git blobs exactly.
No additional DOM, code embed, dependency or timing profile is introduced.

Build/check passes. Existing baseline tests plus retained map and shared
changes: 872 total, 869 pass, 3 existing skips, zero failures. Today's six
tests specific to the removed marquee touch/sync changes are reverted with
the corresponding implementation.

This is a restoration for user comparison, not a claim that the earlier
Safari zoom, badge flash or whole-page crash is resolved. The earlier native
hero sizing trial did not change Webflow's exported image hint; its width
was restored to 100%, and the poster-quality correction remains pending.
