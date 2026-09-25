# Power snippets: staging design preview v1.0.2

Adds one static review excerpt below the shared review badge in Hero - Headline and Hero - Headline VIP. Each component has a Reviews > Show power snippet boolean, default true. Its visibility binding is native Webflow. No carousel or automatic rotation is introduced.

The quote uses the site's existing speech-mark SVG, text-size-large typography and monochrome icon-first attribution. Attribution follows the DD - Text Effect opacity stops: 0% = 0, 50–75% = .5, 100% = .1; smoothing .5. As requested in the v1.0.3 refinement, attribution animates regardless of reduced-motion preference.

## Draft-only boundary

The module executes only on dentalbarns.webflow.io. The shared quote embed holds a compact JSON snapshot of selected CMS excerpts and aggregate numbers; patient text and internal CMS notes are not committed in this repository. The review collection remains in draft and no new data page is created. A native collection connection inside the component saved but could not resolve its CMS fields/filter source through MCP. The proposed separate non-draft data page was rejected by automatic approval review, so this preview deliberately does not depend on it.

CMS rank/excerpt edits do NOT automatically update this snapshot. Refresh the snapshot from CMS before publishing another design revision. Production must wait for a tested CMS publishing/feed workflow and verified rating inputs. Do not remove the hostname guard as a substitute for that work.

## Selection

Home and general VIP pages use the global #1 snippet. Nervous care and Invisalign use their dedicated snippet ranks. Other treatment excerpts use the strongest eligible contextual excerpt by global snippet rank. Cosmetic/Smile Design use natural-results, assessment/first-visit use clear-explanations. Restorative uses a manually selected CMS excerpt that specifically describes restorative work. Facial aesthetics has no evidenced matching snippet and remains empty. Treatment path routing also covers area pages. No full hidden negative review or editorial notes are rendered.

## Tally and score

The preview count is 83 platform review entries: Google 55, Doctify 23, Facebook 3, Yell 2. It is not a unique-patient count. Historic Doctify feedback is attributed to Dr Keely at prior practices. The provisional combined 4.94/5 is calculated from 81 rated entries: it includes the one-star Google review, uses the user-requested 5/5 conversion for Facebook recommendations, and excludes the two unconfirmed Yell ratings. Google positive ratings still require verification. A visible disclosure under the badge opens the methodology. No rating structured data is added.

## Assets and rollback

Google, Facebook and Yell vectors are derived from the existing Webflow review badge. Doctify icon is the unmodified transparent icon served by its official blog: https://wp-global-media.s3.eu-central-1.amazonaws.com/wp-content/uploads/sites/6/2021/07/cropped-Instagram-profile-720x720-1-192x192.png

The new quote embeds load the JS directly with an immutable SHA and SHA-384 integrity. Webflow registered-script application was unavailable; site-wide replacement was rejected by approval review. The JS loads its sibling CSS only on staging. Existing custom-code blocks and applied-script configuration are not replaced. Publish only with customDomains: [] and publishToWebflowSubdomain: true. Rollback: remove the script tag from the two newly added quote embeds, or switch off the native component toggle. Custom-domain publication requires a separate instruction.


Visual QA v1.0.2: override the inherited 60vh height from the existing max-width-medium align-center combo for these new quote containers only; stack the badge disclosure beneath its badge and allow the badge to wrap on narrow screens.


## v1.0.3 user refinements

Equal badge-to-quote-mark and quote-mark-to-text gaps: 2rem desktop, 1.5rem below 480px; existing larger outer spacing below the reviewer is retained. Attribution now clones the actual badge SVG and applies grayscale(1), preserving gradient shading; gradient IDs are made unique. The DD fade is unchanged. Doctify uses the supplied logo-light.svg with only its two wordmark paths removed and an icon-sized viewBox; it is a true inline SVG at the same 2rem box size as the other badge icons. Removed the visible historic-Doctify disclosure at the user’s request; historical provenance and provisional rating basis remain in the CMS and this record.

The user explicitly requested the snippet attribution to stay animated when reduced motion is enabled. Only the review module’s reduced-motion bypass was removed; other site modules are unchanged.


## v1.0.4 spacing and editorial variety

Restore the native margin-xxlarge spacing beneath the badge, matching the text-to-badge spacing above, rather than matching the smaller quote-mark-to-text spacing. Keep the larger outer spacing below attribution. Replace repeated global picks with one fixed, contextually relevant CMS excerpt per main page group: Home, VIP, nervous care, veneers, cosmetic, Smile Design, assessment, hygiene, clear aligners, Invisalign, bonding, whitening and restorative. Reviewer identities and selected content remain in Webflow. Existing global CMS ranks remain unchanged; these are deliberate page selections, not a re-ranking or random rotation.


### v1.0.5 — Home outer spacing
Home now matches the distance from section top to subhero heading beneath the reviewer attribution. Recalculates on resize and font readiness; treatment and service templates are unchanged.


### v1.0.6 — Location reviews and dark variant
Added location topic, verbatim excerpt and location snippet rank to the review CMS. Location uses a Facebook excerpt about the surroundings. The existing dark Hero - Headline variant reduces quote ornament opacity to 35%, preserving layout and attribution animation.
Location also matches outer bottom spacing to the section-to-heading distance, recalculated on resize.


### v1.0.7 — Stable initial rendering
The shared embeds now run the snapshot renderer synchronously at their parser position. Critical review CSS is bundled into the renderer and installed before it inserts SVGs or reveals the quote. No separate review stylesheet or deferred script fetch controls the first layout. The exact selected quote therefore occupies its natural responsive height immediately, instead of inserting below the badge after DOMContentLoaded. The attribution SVG has intrinsic dimensions and a fixed, clipped square wrapper, with grayscale applied before insertion. Attribution opacity is set directly to its current scroll position at startup; subsequent scroll uses the existing DD smoothing. Home/Location outer spacing is established in that same initial task and avoids redundant margin writes. No content selection, tallies, native visibility switches or production hostname guard changed.

Deployment: build the runtime with the CSS placeholder replaced, then include that exact built source inline after the existing JSON snapshot inside both new review embeds. The runtime remains versioned in GitHub; no patient snapshot data is committed. To reproduce the build, run `python scripts/build-power-snippets.py`.

### v1.1.0 — Patient review drawer

The badge now opens the review collection, ordered for the current page. Clicking a power snippet opens its exact review first. The separate drawer module loads on intent, so the v1.0.7 synchronous first render is preserved. It follows Smile Gallery v24 entrance/exit timings, horizontal drag thresholds, bottom navigation arrows, native navbar/VIP displacement and delayed chrome restoration. Mobile uses the full viewport; desktop uses a right-side panel. Keyboard focus is trapped, the background is inert and scroll-locked, and closing restores the originating control and scroll position.

Each slide has the existing platform vector and star artwork, quotation mark, a fixed snippet area, reviewer/date, a fixed review area and a source link. Read more gives long text additional space inside the panel and allows internal scrolling; Read less restores the summary. Recorded ratings are shown accurately, including the four-star Doctify review; unrated Yell entries are labelled. Historic Doctify cards identify Dr Keely's previous-practice provenance. Profile links are labelled View on [platform] rather than presented as exact review permalinks.

Light controls provide topic, relevant/newest ordering and an optional source filter. All sources deduplicates the two cross-posted pairs. The snapshot contains 82 visible source entries, producing 80 slides in All sources. The excluded one-star review text is absent from the snapshot; its rating remains in the 83-entry aggregate. The score-information panel explains the difference and the Facebook/Yell calculation basis. No CMS approval or publication flags are changed.

Data is an inert gzip/base64 script in a separate embed inside each existing shared hero component, decoded only when the drawer opens. The runtime uses native DecompressionStream in current browsers and offers a retry message if loading fails. It remains a staging snapshot, not an automatic CMS feed. Do not commit patient content to the public runtime repository. The drawer bundle is pinned to an immutable GitHub commit with SHA-384 integrity; no site-wide custom code is replaced.

Validation: four Node tests cover relevance ordering, exact snippet entry across cross-posted sources, newest/filter/dedup behaviour and safe source URLs. A staging-only `?review-preview=mobile` layout mode constrains the real panel to 390 by 844 CSS pixels for narrow-layout inspection; it is not device emulation. Manual staging interaction checks are recorded after deployment. Rollback: restore both v1.0.7 power embeds; the inert drawer-data embeds can remain or be removed. No custom domains are published.
