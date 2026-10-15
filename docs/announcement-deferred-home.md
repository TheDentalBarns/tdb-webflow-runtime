# Home announcement: deferred content

Home keeps one empty native announcement shell. Its inner markup is built from src/banner/template.html and bundled into the existing tdb-announcement.js request. The original layout and responsive rules live in tdb-announcement.css, scoped to data-tdb-announcement-lazy; native shell geometry remains in Designer.

The existing interaction/idle loader, consent decision, four-viewport Home reveal, shared Swiper, ticker, motion, CMS availability reader, refresh and generic fallback are unchanged. The existing public availability Worker supplies active/preview JSON. This change does not migrate or create a CMS feed page and does not modify the Webflow Cloud content service.

Other pages retain the shared Announcement component and native styles. Home's unused hidden ticker template is omitted; the shared ticker creates its own text nodes.

## Native references and rollback

Site: 677cf86cf9952f978d94d80c. Home: 677cf86df9952f978d94d8a9. Home footer: 4c8e5b24-0116-2a8d-4190-53cdd4860ef5.

Replacement empty mount: 40bfe78f-4af2-8eaf-901e-26f23b63068d. Original Home instance: 4c8e5b24-0116-2a8d-4190-53cdd4860fd9. Shared Announcement definition retained: ce1342a8-e83e-b099-c1ac-71da7b84c3ae.

To roll back, insert the shared Announcement component before the replacement mount inside the Home footer, remove the empty mount, and restore runtime pin d56ef42757187fca47789e2a350808cd4f1c3c13. Publish staging only.

## Verification

Tests cover empty-before-consent/data behavior, single mount, preserved motion duration, countdown/manual rotation/VIP activation, unavailable-data recovery, safe text updates and native/signature-only compatibility. Browser checks compare native and external layout with Designer inner rules removed.
