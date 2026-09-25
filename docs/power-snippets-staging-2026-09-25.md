# Power snippets: staging design preview v1.0.0

Adds one static review excerpt below the shared review badge in Hero - Headline and Hero - Headline VIP. Each component has a Reviews > Show power snippet boolean, default true. Its visibility binding is native Webflow. No carousel or automatic rotation is introduced.

The quote uses the site's existing speech-mark SVG, text-size-large typography and monochrome icon-first attribution. Attribution follows the DD - Text Effect opacity stops: 0% = 0, 50–75% = .5, 100% = .1; smoothing .5. Reduced-motion preference renders the attribution fully visible.

## Draft-only boundary

The module executes only on dentalbarns.webflow.io. The Webflow footer holds a compact JSON snapshot of selected CMS excerpts and aggregate numbers; patient text and internal CMS notes are not committed in this repository. The review collection remains in draft and no new data page is created. A native collection connection inside the component saved but could not resolve its CMS fields/filter source through MCP. The proposed separate non-draft data page was rejected by automatic approval review, so this preview deliberately does not depend on it.

CMS rank/excerpt edits do NOT automatically update this snapshot. Refresh the snapshot from CMS before publishing another design revision. Production must wait for a tested CMS publishing/feed workflow and verified rating inputs. Do not remove the hostname guard as a substitute for that work.

## Selection

Home and general VIP pages use the global #1 snippet. Nervous care and Invisalign use their dedicated snippet ranks. Other treatment excerpts use the strongest eligible contextual excerpt by global snippet rank. Cosmetic/Smile Design use natural-results, assessment/first-visit use clear-explanations. Restorative uses a manually selected CMS excerpt that specifically describes restorative work. Facial aesthetics has no evidenced matching snippet and remains empty. Treatment path routing also covers area pages. No full hidden negative review or editorial notes are rendered.

## Tally and score

The preview count is 83 platform review entries: Google 55, Doctify 23, Facebook 3, Yell 2. It is not a unique-patient count. Historic Doctify feedback is attributed to Dr Keely at prior practices. The provisional combined 4.94/5 is calculated from 81 rated entries: it includes the one-star Google review, uses the user-requested 5/5 conversion for Facebook recommendations, and excludes the two unconfirmed Yell ratings. Google positive ratings still require verification. A visible disclosure under the badge opens the methodology. No rating structured data is added.

## Assets and rollback

Google, Facebook and Yell vectors are derived from the existing Webflow review badge. Doctify icon is the unmodified transparent icon served by its official blog: https://wp-global-media.s3.eu-central-1.amazonaws.com/wp-content/uploads/sites/6/2021/07/cropped-Instagram-profile-720x720-1-192x192.png

Load CSS and JS using the resulting immutable full commit SHA. Publish only with customDomains: [] and publishToWebflowSubdomain: true. Rollback: remove the marked Power Snippets head/footer blocks, or switch off the native component toggle. Custom-domain publication requires a separate instruction.
