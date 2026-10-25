# Home: complete DOM, CSS and JavaScript audit — 25 October 2026

Governing reference: [TDB Home architecture and engineering standard](https://chatgpt.com/space/page_c22eaec26d7c819197df9524f243acbd). This is a read-only audit of staging Home, its published HTML/native CSS and its external runtime. No Designer property, runtime asset, release pin or publication was changed for this audit.

Baseline: the exact 22 October pre-DOM snapshot, captured at 06:05 UTC, runtime `e56f6efb510da0ef966683c60db67fc8cc9f77f1`. Current: staging publication of 25 October at 15:36 UTC, runtime `782454b4d242e7341af7df78e06a749329e33758`, native page CSS `b464f4dea`. This does not substitute for a comparison with the older 20 October screenshot.

The previous three-wrapper reconciliation was a completed correction, **not a completed whole-page DOM audit**. This report supersedes that broader completion claim. The audit is complete to the evidence and device limits below; the recommended implementation is not performed.

## Assessment

The page retains a sound modular core: native content and reserved geometry, separate feature controllers and styles, common transport/motion/slider services, and preparation before activation. The weak area is the boundary around compact controls and native motion. Some DOM reductions replaced simple markup with more CSS, compatibility rules and loading/state coordination. Subsequent motion-profile, audio and interaction work also increased files independently of DOM removal.

**311 fewer source elements did not produce a substantial initial payload reduction.** Tracked initial HTML, CSS and TDB startup/foundation together are only 2,840 raw bytes and 394 consistently gzipped bytes smaller. Across the reachable Home runtime catalogue, later JS/CSS has grown. Neither result establishes a speed change: transfer, parse/style work, rendering and interaction costs are different measurements.

Keep the good CMS/data reductions and the reserved-card architecture. Stop treating fewer nodes as a deliverable. The next coherent change should simplify control/motion ownership, with a complete before/after budget and behavior checks; it should not be another wrapper-removal sweep.

## 1. Whole-page cost, without counting the same file twice

All numbers are bytes. Controlled gzip is Node level 9 applied separately to each original file. It allows like-for-like comparison; it is not the CDN's actual compression setting. Inline CSS, JSON-LD and inline scripts are already included in HTML.

| Layer | Before raw | Current raw | Raw change | Before gzip | Current gzip | Gzip change |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home HTML | 213,938 | 184,887 | −29,051 | 36,775 | 32,178 | −4,597 |
| Native CSS, shared + page | 196,134 | 215,584 | +19,450 | 35,723 | 38,423 | +2,700 |
| Shared UI CSS | 11,884 | 15,037 | +3,153 | 2,945 | 3,301 | +356 |
| TDB startup + foundation JS | 33,824 | 37,432 | +3,608 | 11,370 | 12,517 | +1,147 |
| **Tracked initial subtotal** | 455,780 | 452,940 | −2,840 | 86,813 | 86,419 | −394 |

The initial subtotal excludes unchanged Webflow/jQuery, fonts, images and optional third parties. Including those unchanged initial scripts would make the percentage reduction still smaller. Body descendants fall **1,407 → 1,096**; all parsed elements, including head, fall **1,443 → 1,132**. These are source-document counts, not an assertion about the later live DOM.

Current direct delivery observations, requesting `gzip, br`:

| Current resource | Encoding | Decoded bytes | Encoded body bytes |
| --- | --- | ---: | ---: |
| HTML | gzip | 184,887 | 37,636 |
| Native shared CSS | br | 31,579 | 8,468 |
| Native page CSS | br | 184,005 | 30,500 |
| UI CSS | br | 15,037 | 2,939 |
| Startup + foundation | br | 37,432 | 11,730 |
| jQuery | br | 89,476 | 30,691 |
| Webflow JS, two files | br | 363,103 | 72,505 |
| Fonts, two files | identity | 33,048 | 33,048 |
| Preloaded logo | br | 3,808 | 1,638 |

The measured fixed-resource subset above totals **942,375 decoded / 229,155 encoded body bytes**, including HTML, three CSS files, startup/foundation, jQuery, two Webflow bundles, two preloaded fonts and the preloaded logo. It excludes response headers, the responsive hero poster, other images, later modules, feeds and third-party media/tracking. It is not a complete page-load transfer total. CDN encoded sizes can vary between edges while decoded hashes remain identical.

The shared/page stylesheets are render blocking. UI uses the existing `media=print`/onload handoff, with its noscript fallback; those two HTML references are **not two normal JavaScript-enabled downloads**. Foundation is preloaded and started at DOM readiness. The 130-byte viewport script and 181-byte Webflow class initializer are unchanged. The large head script is **23,636 bytes of JSON-LD data**, not executable initialization logic. Head inline styles remain the same 622-byte base plus 307-byte native-control block, including whitespace.

### Later Home catalogue

This is the **union of 50 distinct, currently reachable TDB JS/CSS assets after the early phase**, including the post-decision runtime. It is a potential full-journey code budget, not a claim that every visitor downloads everything. Shared prerequisites are counted once, aliases are excluded, CSS embedded inside a JS bundle is not counted again. Feeds, image/audio/video payloads and third-party SDKs are outside this code total.

| Family, excluding shared dependencies listed separately | Current raw | Raw change | Current gzip | Gzip change |
| --- | ---: | ---: | ---: | ---: |
| Post-decision orchestration | 70,373 | +2,793 | 19,084 | +947 |
| Shared motion and carousels | 135,577 | +2,383 | 43,600 | +784 |
| Native navigation and controls | 29,759 | +2,294 | 7,781 | +197 |
| Services and treatments | 44,817 | +5,456 | 13,961 | +1,853 |
| Smile | 51,503 | +1,325 | 13,659 | +100 |
| Instagram | 36,980 | +329 | 11,572 | −29 |
| Quotes and reviews inline | 80,578 | +3,164 | 27,073 | +821 |
| Shared drawer prerequisites | 21,835 | +1,055 | 8,223 | +250 |
| Review drawer | 79,591 | +744 | 15,322 | +232 |
| USP drawer | 30,928 | +17 | 8,035 | +12 |
| VIP and forms | 38,064 | −654 | 12,318 | −17 |
| Marquees and partner popovers | 45,680 | +73 | 12,821 | −166 |
| Announcement and availability | 27,135 | +649 | 9,279 | +63 |
| Hold audio (paused investigation) | 8,373 | +2,870 | 3,317 | +995 |
| Vimeo (functionality consent) | 30,283 | +1,907 | 8,109 | +574 |
| Smooth scroll (fine pointer desktop) | 17,741 | 0 | 4,992 | 0 |
| Attribution | 10,809 | 0 | 3,863 | 0 |

Together: **735,621 → 760,026 raw bytes (+24,405)** and **216,393 → 223,009 controlled gzip bytes (+6,616)**. All 50 current CDN bodies match their repository build hashes. Their observed encoded bodies total 222,413 bytes. The exact file membership and hashes are in the [evidence record](home-full-audit-20261025.json).

Combining the tracked initial subtotal with this later catalogue gives **+21,565 raw / +6,222 controlled gzip bytes** since the pre-DOM snapshot. This includes all intervening feature work. It is not the isolated cost of reducing DOM, and it is not a single visit's transfer size.

Five Senses is now a link to its dedicated page; Home has no `data-tdb-senses-open` trigger. Its full controller/styles are excluded. The dormant sitewide launcher remains in runtime. Likewise, the standalone calculator, archive/legacy reviews, old Instagram entries, secondary-page layout sheets, tooltip controller with no current Home consumer, legacy VIP stylesheet and duplicate output aliases are excluded.

## 2. What caused the growth

### Native CSS

The exact 19,450-byte growth reconciles as follows; these are disjoint accounting buckets, not independent savings forecasts:

| Change bucket | Raw change | Interpretation |
| --- | ---: | --- |
| Pseudo-element rules, baseline to before timing linkage | +10,917 | Most compact artwork, spinners, chevrons, pulses, shading and hero decorations now live in native CSS. |
| Other pre-linkage native changes, including shared CSS | +2,264 | Remaining layout/state changes and export regrouping, net of removed rules. |
| 25 October native timing linkage | +8,733 | Same 69 motion-bearing page rules; tokens and Webflow expansion of border/radius/transition declarations increased their serialization. |
| Subsequent native cleanup and three restored boundaries | −2,464 | Recorded padding, inherited variant and boundary corrections. |
| **Total** | **+19,450** | **196,134 → 215,584** |

The number of page rules containing motion declarations was 70 in the baseline and is 69 now. The timing edit did not introduce 8.7 KB of new animation behavior. For example, `.button` grew 704 bytes and `.form_checkbox-icon` grew 649 bytes partly because compact borders/radii were expanded into longhands. Moving timings into Designer therefore did not make initial delivery free. The historical UI/native comparison for that change was already close to flat compressed.

Current page CSS contains 34 pseudo-element rules totaling 11,435 serialized bytes, versus four / 518 bytes originally. This is rule footprint, including layout/artwork, not a claim about animation CPU cost. Variant-bearing rules account for 36,402 serialized bytes and overlap other categories. Positive consumers on other pages and retained draft components prevent a blanket purge.

### Early JavaScript and shared UI

The +3,608 early-JS bytes are traceable to **+1,785 audio first-input/readiness changes**, **+1,180 shared motion-profile startup**, **+493 hero fade/rotation bridge**, and **+150 motion-profile adaptation in foundation**. They are not all DOM cleanup. The actual audio controller remains external; its separate +2,870-byte growth is in the later catalogue. The paused audio/Safari investigation is not reopened here.

UI is **11,884 → 15,037**, a net +3,153. It briefly reached 30,558 during the broad motion projection; subsequent ownership cleanup removed much of that. Today it includes essential early feedback, focus/consent/readiness coordination, native timing compatibility, compact controls and some later-use support. **It cannot honestly all be described as urgent first-paint CSS.**

Indicative independently minified fragments: compact control effects 3,221 bytes; native timing projection 2,469; hero compact control 1,547; holder feedback/coordination 1,159. These are diagnostic fragment sizes, not additive bundle budgets. Moving a fragment must preserve its dependencies and loading feedback before its feature stylesheet arrives.

The largest later growth is parallax/treatment JS (+5,456), audio (+2,870), runtime orchestration (+2,793), Swiper/adapter (+1,372) and Vimeo CSS (+1,255). Git history separates the treatment changes into CMS reconstruction, stamp dragging/edge behavior, rendering work, motion adaptation and the later scroll-lock repair. Increased code can buy correctness or less frame work; it should carry an explicit cost, not be called a loading optimization automatically.

## 3. Structural changes, adjudicated

The dated snapshot ledger shows the changing **combined** footprint rather than HTML alone. Some publications include several changes; the ledger deliberately does not assign every byte to a wrapper.

| Published milestone | Body elements | HTML | Native CSS | UI | Early JS | Tracked raw subtotal | Controlled gzip subtotal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pre-DOM baseline | 1,407 | 213,938 | 196,134 | 11,884 | 33,824 | 455,780 | 86,813 |
| CMS/copy/image batch | 1,333 | 205,285 | 196,618 | 11,884 | 33,824 | 447,611 | 86,489 |
| Spinners/icons/disclosures/padding batch | 1,226 | 193,546 | 209,685 | 12,844 | 33,824 | 449,899 | 85,374 |
| Spacing and compact-speaker correction | 1,217 | 193,697 | 211,371 | 13,316 | 33,824 | 452,208 | 85,577 |
| Independent artwork correction | 1,217 | 193,159 | 207,797 | 13,480 | 33,824 | 448,260 | 85,416 |
| Navigation/footer publication | 1,206 | 192,660 | 208,840 | 13,480 | 33,824 | 448,804 | 85,492 |
| Captions/USP/dividers/arrows | 1,186 | 191,704 | 208,865 | 13,480 | 33,824 | 447,873 | 85,368 |
| After decorative rows, wrappers and stamp shading | 1,145 | 188,043 | 211,150 | 13,480 | 35,609 | 448,282 | 86,052 |
| Later 17-element consolidation | 1,128 | 187,695 | 211,854 | 13,480 | 35,609 | 448,638 | 86,110 |
| Current, after subsequent work and three restorations | 1,096 | 184,887 | 215,584 | 15,037 | 37,432 | 452,940 | 86,419 |

| Change group | Decision | Whole relationship and evidence |
| --- | --- | --- |
| Duplicate service/treatment CMS copy; matching desktop/mobile service images | **Keep** | First batch removes 74 elements / 8,653 HTML bytes, adds 484 native CSS bytes and 387 deferred parallax bytes. Net affected raw saving 7,782. All 98 CMS items and 16 lists remain. Native price/duration/URL bindings are kept; visible stamp titles are matched by URL. This is the strongest structural saving. |
| Direct text in static navigation/social/CTA controls | **Keep** | Removes redundant text-only children without replacing editable CMS/component bindings with hardcoded strings. Native destinations and accessible controls remain. |
| Shared Secondary Button labels/arrows | **Keep restored binding structure** | The unpublished text-flattening attempt lost bound children and was restored before publication. Current labels and arrow children are present. Do not count that failed attempt as a saving or retry it through hardcoded text. |
| Nine loading graphics, three speaker icons, USP arrow artwork | **Simplify ownership; retain behavior** | HTML reduction was partly paid back through three native spinner style families, early compatibility tokens and a lazy artwork dispatcher. Shared loading feedback is legitimate; near-identical decorative geometry should not gain separate owners merely to remove SVG children. Audio remains paused. |
| Twelve disclosure labels/chevrons and award lists | **Keep, with one motion owner** | Direct button text, native decorative chevrons and list-owned typography are reasonable. Preserve closed first paint, focus, aria-expanded and the deliberate 20px accordion gap. Transition choreography belongs in the disclosure module; early CSS supplies state/fallback. |
| Eighteen section-padding wrapper removals | **Mixed: keep safe ones; retain three restorations** | Applying padding to sections inset their sibling sticky backgrounds. Wellness, location and sketch now have their original content-only `padding-global` boundary again. Those three nodes cost +27 HTML bytes and remove 571 native CSS bytes. A layout boundary was useful here. |
| Navigation/footer 11-wrapper publication | **Keep current behavior; no further flattening** | Publication: HTML −499, native CSS +1,043, net +544 raw / +76 gzip. Of the CSS increase, 532 bytes are separate icon/spinner export changes; the wrapper-related rules add 511, making the isolated wrapper trade about +12 raw. The initial publication total must not all be blamed on wrappers. Retain the 11 navigation image clipping wrappers and CMS structure. |
| Trio captions, five USP outer groups, dividers and inner arrows | **Keep** | Twenty elements / 956 HTML bytes removed for 25 native CSS bytes: −931 raw. Existing owners already carry alignment, decoration or motion. Image/blur/audio boundaries remain separate. |
| Five summary stars and five decorative barn images | **Keep; simplify only through shared existing primitives** | HTML −1,485. Decorative owners paint five explicit layers; barn artwork is released near the section. Counts and opacity are intentional; a prior `space` implementation drew six stars and was corrected. New runtime handling and native rules are real costs, not free DOM savings. |
| Fourteen selective content wrappers | **Keep** | HTML −594 / page CSS +244 = −350 raw, controlled gzip essentially unchanged. Six useful alignment/marquee/summary boundaries were deliberately retained. Footer block layout was restored after a visual regression. |
| Service shading and treatment stamp confirmation | **Keep static pseudo artwork; move module motion to its module** | Seventeen elements removed. HTML −1,582, native CSS +939, deferred slider CSS +307, JS −81 = −417 raw but +149 controlled gzip. One stamp state now drives shading/artwork, which is logically better than redundant writes; it is not a transfer win. Keep 20px blur and the fade through disarming. |
| Later 17-element gradients, summary row, footer text and award grouping | **Keep useful consolidation; reject node-count justification** | HTML −348 / native CSS +704 = **+356 raw / +58 gzip**. Static pseudo shading is a coherent owner, but saving 17 nodes did not save payload. The animated location overlay was correctly retained as a scroll-motion target. |
| Later compact pulses, navbar chevrons, quote/platform owners, footer lists and Smile count | **Keep semantic/data improvements; simplify compact-control CSS** | Current-vs-17-pass region diff accounts for 22 further removals outside hero. Runtime reuses the original platform owner and resolves count/state dynamically. Avoid a second native/early/module styling path for each pulse. Exact isolated publish cost for each of these individual edits is not recoverable from the available snapshots. |
| Hero 16-element control → two-element semantic button/art | **Keep button; simplify implementation** | Its old control subtree was 2,440 serialized bytes versus 333 now. Five newly identified hero native rules alone total 2,951 bytes; one mask rule repeats the same 848-byte URL twice. Early hero CSS and the foundation transition bridge add further cost. The HTML saving cannot be credited as a whole-stack saving. Preserve entrance, cancellation, loading→play/pause, buffering and spinning throughout fade-out. Do not simply delete the bridge or reinstate inaccessible click targets. |
| Treatment flex/responsive structure and scroll handoff | **Keep** | One later structure addition contributes to the net node reconciliation. Geometry and drag ownership are functional requirements. The +1,022-byte deferred gesture fix uses the existing scroll lock and cancels Lenis inertia once; it is separate from DOM simplification. Physical-phone acceptance remains open. |
| Native Smile, IG and review reserved cards | **Keep** | Designer owns their initial dimensions/artwork. Feature markup/CSS remains external. Desktop audit observed unchanged heights before/after ready: Smile 660.8125px, reviews 721.9375px, IG 688px. No reason to move the full cards back into initial HTML or UI. |
| Native VIP shell and visible footer form | **Keep** | Twelve-element drawer shell plus empty body initially; content/form behavior loads later. The footer form is visible native page content with unchanged field IDs/names. Shared variants have other consumers. Do not delete their native CSS by filename resemblance. |
| Remaining crop, motion-target, CMS and background boundaries | **Keep** | These are functional nodes, not redundant wrappers. Avoid rebuilding them with selector complexity, source duplication or runtime geometry just to reduce the source count. |

The final count reconciles: 1,407 → 1,333 → 1,226 → 1,217 → 1,206 → 1,186 → 1,176 → 1,162 → 1,145 → 1,128 → 1,093 → 1,096. The last net −35 consists of the hero −14, other consolidation −22, and a later treatment-structure +1; the final +3 are the restored boundaries.

### Disjoint region accounting

The following regions do not overlap. HTML is parser-serialized subtree size, so it is diagnostic rather than a wire budget. Their node deltas sum to −311. Their HTML deltas sum to −29,035; the remaining −16 bytes are document/publication envelope differences. Dynamic partner ordering is not a structural saving.

| Disjoint region | Elements before → current | Element change | Serialized HTML change |
| --- | ---: | ---: | ---: |
| Consent shell | 13 → 13 | 0 | 0 |
| Navbar background | 1 → 1 | 0 | 0 |
| Global style embed | 2 → 2 | 0 | 0 |
| Navigation | 159 → 140 | −19 | −193 |
| Hero | 34 → 20 | −14 | −2,135 |
| Opening awards marquee | 29 → 28 | −1 | −19 |
| Review introduction | 54 → 39 | −15 | −1,143 |
| Services | 86 → 57 | −29 | −5,647 |
| First page break | 2 → 2 | 0 | −28 |
| Team quotes | 37 → 30 | −7 | −185 |
| Three visit/audio cards | 79 → 51 | −28 | −2,623 |
| Smile | 24 → 16 | −8 | −277 |
| Wellness | 70 → 45 | −25 | −2,327 |
| Patient quotes | 34 → 30 | −4 | −112 |
| Location | 25 → 24 | −1 | −51 |
| Treatments, including stamps/details | 183 → 127 | −56 | −4,636 |
| Review cards holder | 11 → 10 | −1 | +70 |
| Second page break | 2 → 2 | 0 | −28 |
| Awards + Instagram | 130 → 106 | −24 | −778 |
| Partner marquee | 48 → 47 | −1 | −19 |
| Sketch/closing introduction | 28 → 28 | 0 | −28 |
| Practice text | 11 → 9 | −2 | −93 |
| Footer, USP, VIP and form | 336 → 260 | −76 | −8,783 |

## 4. Actual ownership and loading contracts

| Layer/experience | Initial owner | Preparation and activation | Decision |
| --- | --- | --- | --- |
| Native page | Designer | Content, semantics, responsive layout, crops, essential controls, holder geometry and fallback appearance exist before JS. | Preserve. Native CSS still has some module motion that should be untangled. |
| Startup/foundation | External 10,673 + 26,759 JS | Registry/profile, first-input capture, consent, basic navigation, scroll-lock service and small hero feedback bridge. Full audio/gallery/drawer controllers are not embedded in these bundles. | Keep essential work; avoid adding further feature bridges. |
| Post-decision runtime | External 70,373 JS | Either a valid accept or reject decision releases local features. Startup steps are scheduled separately; controller downloads retain their own gates. This is orchestration plus some small shared behavior, not just an array of URLs. | Keep; simplify proven duplicate orchestration without a new global framework. |
| Services/treatments | Native CMS + deferred parallax/slider assets | 1,200px preparation or interaction; styles and common engine before plugin; ordinary mounting has a separate near-view gate. Arrow actions are held/replayed while loading. | Preserve crop/copy/ticker layers; module owns motion/easing. |
| Smile | Native holder + feed module/CSS/gallery | 1,200px; fetch data, decode first two images and prepare CSS/engine in parallel; mount before replacing holding state. Retry retains fallback. | Correct boundary. |
| Instagram | Native holder + deferred adapter/native module/CSS | 1,200px; entry/destination decode, CSS/controller readiness, then connect and activate; image window limits active images. | Correct boundary. |
| Inline reviews | Native summary/quote/holder + review loader | Review loader downloads after the decision; inline components prepare at 1,200px or direct intent. Shared CMS/ticker assets are reused. | Preserve; loader's old “700px” comment is stale. |
| Review and USP drawers | Native launch controls; external template/CSS/controller | Shared `watchIntent` means **700px proximity or interaction**, not exclusively hover/click. Prepare assets/data; opening is explicit with busy/focus/lock handling. | Preserve readiness; describe the gate accurately. |
| Team quotes | Native quotes + external full quote renderer | Foundation downloads the 7,928-byte renderer after either decision; renderer gates enhancement at 800px. Direct input can start just that quote earlier. | A specific opportunity to defer the renderer's download, while retaining first-key replay. It is not inside foundation, but its request starts earlier than its visual need. |
| Marquees / partner cards | Native lists + external marquee | Marquee prepares at 600px. Partner popover uses settled visible/interaction policy; its content/CSS stays separate. | Keep shared engine; recognize top marquee can release that engine early. |
| VIP / announcement | Native shell + external content/styles/controllers | Announcement waits for interaction/restoration and hides until its page-position condition; VIP preparation also requires announcement readiness. Native VIP skips the legacy `tdb-vip.css` request. | Preserve first-open and form contracts; no blanket “VIP CSS unused” deletion. |
| Hold audio | Native picture/button + startup input capture | Controller prepares at 600px/intent after local release; audio/controller/effect code stays external. | Correct high-level boundary; account for early capture cost. Investigation remains paused. |
| Vimeo | Native poster/control + consent gate | Functionality consent, then 300px/intent loader; CSS/controller/SDK separate. | Retain essential early cancellation/loading feedback. Audit hero priority separately. |
| Smooth scrolling | Deferred Lenis | Fine-pointer desktop only, after load/idle or a warm session. Native touch is not replaced by Lenis syncTouch. | Keep existing scroll-lock ownership. |
| Third parties | Separate consent owners | Vimeo/player assets, analytics/Intellimize/Meta and Brevo retain their category gates. They are outside the TDB code catalogue. | Do not merge these with local feature readiness or weaken consent to improve a waterfall. |

In a normal desktop return navigation with an **essential-only saved choice**, the untouched top-of-page holders remained unmounted. Nevertheless, quote renderer, runtime, motion, navbar, Swiper, first marquee, review data/intro, attribution, Lenis and control-motion CSS loaded: **327,884 raw / 100,630 controlled gzip bytes beyond the early phase** in the observed set. No gallery/drawer/audio controller was embedded in the initial loader. The distinction is between *early source*, *post-decision downloads* and *proximity/activation*, not merely “initial versus lazy.”

## 5. Duplicates and misplaced responsibilities

**Confirmed:** the current native export contains 1,109 bytes of exact repeated declarations within rules, 2,915 bytes of repeated whole rules in matching at-rule contexts, and 39 repeated selector entries totaling 1,976 bytes. These inventories overlap; they must not be added into a savings claim. Cascade order can make a later identical rule significant when competing declarations intervene. Native reserialization has already resisted a bounded normalization trial, so repeated authoring edits are not a justified remedy.

No identical whole-rule duplicates were found by the same context-aware check in current UI and the inspected Home feature stylesheets. That does not prove there are no equivalent declarations or purposeful overrides. Generated assembled UI, its source fragments and readable/minified build outputs are different representations, not multiple downloads. Small shared code included in independently useful bundles is not automatically worth extracting into a new request.

**Confirmed ownership exceptions:** native CSS still declares the service blur transition; treatment stamp/card confirmation fades; treatment copy and ticker fades; image transform transition properties; Smile slide fade; and VIP arrow state transitions. The early native timing projection also overrides some of these. These are explicit migration candidates. Moving only the duration line, leaving state and cascade distributed, would not finish the job.

**Confirmed narrow layout exception:** `tdb-feed-holders.css` still contains the review holder's 480–991px, max-height 500px landscape width/margin rule. Its other content is loading feedback, asset parking and progress visibility. Keep the initial geometry stable; consolidate that rule with the existing authored responsive-holder exception only if Webflow's breakpoint/orientation constraints allow it without a new head style.

**Retained data relationships:** treatment prices consume Smile-named ticker styles. This is a naming/ownership debt, not unused CSS. Shared pagination source is already composed into the relevant existing feature sheets; a brand-new early shared sheet would worsen the loading boundary.

**Pre-existing markup issue:** the `All-treatments` duplicate anchors were corrected, but six CMS treatment-image wrappers still share one Webflow-generated `w-node-*` ID. There is no demonstrated interaction failure from it. If normalized, transfer its grid selector to a class first and verify every card; do not strip generated IDs indiscriminately. Native form field names/IDs are unchanged.

## 6. Prioritized improvements and four-perspective decision

| Priority / proposal | LCP/startup review | Interaction review | Polish/readiness review | Maintenance review / chair decision |
| --- | --- | --- | --- | --- |
| **1. One complete control/motion ownership pass** | Target early/native duplication, not another small HTML count. Recompute total compressed cost. | Preserve interrupt/reentry, first-input replay and shared lock/state services. | Keep exact glyphs, fades, pulse timing, focus and 20px blur. | **Adopt as the next implementation scope.** Start with the hero's duplicated artwork and the service/treatment motion split. Keep semantic button and static native geometry; move complete module motion relationships into existing deferred sheets. No promised 8.7 KB recovery. |
| **2. Exact JSON-LD whitespace minification** | Verified counterfactual: **−5,873 HTML raw / −392 whole-HTML gzip**, with identical parsed JSON. | No interaction dependency. | No visual dependency. | **Recommend.** Preserve graph content and escaping; review as a separate small change. Do not externalize/delete structured data merely to shrink HTML. |
| **3. Audit and retire obsolete IX2 configuration** | Both unchanged Webflow bundles still total **363,103 raw bytes**, plus 89,476 jQuery. This outweighs wrapper savings. | Must retain forms, navbar, anchors and any remaining legitimate interactions. | Some IX2 action selectors still match Home elements even though Home has no `data-w-id` hooks. | **Recommend a bounded dependency inventory, then removal where proved safe.** The runtime contains initialized IX2 configuration; this audit does not prove the whole Webflow/jQuery payload removable. No arbitrary replacement loader. |
| **4. Match post-decision preparation to actual need** | Quote renderer currently downloads before its own proximity gate; top marquee brings in shared Swiper early. | Avoid losing first keys/arrows or making returning visits feel late. | Prepare before scroll arrival; don't blanket-reduce margins. | **Recommend targeted scheduling review.** Keep one dependency cache, quantify fresh and returning paths, and prefer an existing gate over another observer layer. |
| **5. Hero image delivery** | Both posters are authored lazy; the visible desktop poster is a large viewport image, while the logo alone is preloaded/high priority. | No change to video consent or manual controls. | Keep responsive crops; make only the active poster eager/high priority if it is the intended critical visual. | **Candidate, not an implemented or measured speed win.** Avoid fetching both mobile and desktop posters. This is more material to LCP than deleting another decorative span. |
| **6. Lifecycle and expanded DOM** | Initial source count cannot describe the later journey. | Existing frame batching/visibility gates and gesture repair are valuable. Legacy slider/tooltip helpers have less complete teardown than newer feeds. | Retain warmed drawers and image decode where they prevent flashes. | **Keep behavior; fix a concrete lifecycle leak when demonstrated.** No new observer framework, universal virtualization or destroy-on-every-close policy without evidence. |
| **7. Native export repeats, variants and tiny wrappers** | Small, uncertain compressed recovery; changing shared components carries broader cost. | Retained consumers and state resets matter. | Native draft/other-page variants are not proved unused by Home absence. | **Do not pursue a blanket purge or undo all reductions.** Use the already verified consumer records; delete only a proved redundant owner. |

The perspectives constrain each other: LCP cannot buy bytes by delaying essential feedback; polish cannot preload every full experience; maintenance cannot centralize complex feature CSS into UI; and DOM optimization cannot remove the nodes that preserve crop, semantics or motion ownership. The chair accepts a bounded ownership pass and exact metadata minification, keeps the successful modular/card/CMS architecture, and rejects another arbitrary DOM target.

## 7. Verification and practical limits

- Reconciled the original snapshot, nine published milestones including current, immutable runtime history, current native AST and Home feature build graph. All tracked totals and node deltas reconcile. The curated JSON record retains the exact asset membership, hashes, compressed observations and diagnostic inventories.
- All 50 reachable later TDB asset bodies match the current immutable build; startup/foundation/UI also match. No source or dist changes occurred between the installed runtime and this documentation branch.
- Source keeps 98 CMS items / 16 lists. The six intentionally redundant treatment-detail anchors are removed; 109 native links remain. Visible footer form field IDs, names and types are unchanged. Remaining CMS title/URL/price reconstruction is explicit, not a hardcoded replacement.
- Live desktop Chromium, 1363×936: normal navigation, essential-only choice, untouched holders at top, Smile/review/IG preparation and readiness with unchanged holder heights; Sight opens; USP opens from its first cold controller request; review drawer opens from the settled page, then closes with trigger focus restored and page lock released. These are smoke checks, not exhaustive network-failure or physical-device tests.
- After visiting the feeds and preparing/opening drawers the live document reached roughly 2,900 elements. This is expected dynamic content and cached panels, not a reversal of the source count. It illustrates why node count alone is inadequate. Hidden review content itself accounted for 811 descendants in the inspected prepared state; do not equate hidden DOM with an equal amount of active layout work.
- Existing interaction fixtures and rendering benchmarks are recorded in the linked earlier reports. No new paid test, page-load benchmark, CPU/GPU trace, INP measurement or physical-phone fling test was run. The cloud browser does not expose the required device/tracing control. The prior 768-pass gesture suite establishes ownership/cleanup, not compositor performance.

A future implementation should compare one immutable before/after pair across: first undecided visit, returning decided visit, rapid scroll arrival, first input while downloading, interrupted loading/cancel, keyboard/focus return, narrow portrait/landscape, and the reported vertical-fling→horizontal-drag sequence on a phone. Preserve the current fallback if styles/data fail. Record raw, controlled compressed and actually encoded bytes separately, with a per-phase unique-asset list.

## Durable ethos

**Optimize the complete relationship, not the smallest DOM or file. Designer owns static layout, semantics, crops and reserved space; feature modules own their complex states, motion and internals; shared code owns only genuine primitives and essential handoff. Keep useful boundaries. Prepare before need, activate on the correct gate, preserve first input and failure fallback, and judge a change by its total delivery cost, behavior and maintenance burden.**

Always reference the canonical engineering standard before further Home improvements. Record dated findings separately from the durable rule. This audit changes documentation only; staging runtime and native CSS remain exactly as audited.
