import { createFeedService } from '../feed.mjs';

const handle = createFeedService({ report: (detail) => console.error(JSON.stringify(detail)) });

// Webflow Cloud provides bindings at runtime. No secret is bundled for clients.
export default { fetch: handle };
