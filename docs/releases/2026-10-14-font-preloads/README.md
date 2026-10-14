# Preload the two active Sweet Sans font files

Add font/woff2 preloads for Sweet Sans Pro Light (300) and Regular (400) to the global head, directly after the existing logo preload and before global UI styles. Use crossorigin=anonymous to match font fetching. URLs exactly match the shared Webflow stylesheet. No changes to font-face, font-display:swap, fallback metrics, CSS or JavaScript.

Rollback: restore before-site-head.html. Deploy to the Webflow subdomain only.
