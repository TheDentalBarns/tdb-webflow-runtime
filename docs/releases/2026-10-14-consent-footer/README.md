# Consent script moved to global footer

Move the existing consent comment and script tag unchanged from the global head to the start of the global footer, before the deferred navbar loader. Preserve defer, the immutable script URL, every asset pin and data attribute. No JavaScript or CSS source changes.

Rollback: restore both before-site files. Deploy only to the Webflow subdomain.
