# react-router-seo

```tsx
// server.js
const serverBuild = await import('./build/server/index.js');

app.use(
  createRequestHandler({
    build: serverBuild,
    getLoadContext: () => ({
      serverBuild,
    }),
  })
);

// sitemap.xml.ts
import { generateSitemap } from 'react-router-seo';

import type { Route } from './+types/sitemap.xml';

export async function loader({ context, request }: Route.LoaderArgs) {
  return generateSitemap(request, context.serverBuild.routes, {
    url: 'https://example.com',
  });
}
```

```tsx
// signout.ts
import type { SeoHandle } from 'react-router-seo';

export const handle: SeoHandle = { seo: { sitemap: false } };
export const action = () => {};

// routes.ts
import { index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('signin', 'routes/signin.tsx'),
  route('signup', 'routes/signup.tsx'),
  route('signout', 'routes/signout.ts'),
  route('sitemap.xml', 'routes/sitemap.xml.ts'),
];
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
  <loc>https://example.com/</loc>
</url>
<url>
  <loc>https://example.com/signin</loc>
</url>
<url>
  <loc>https://example.com/signup</loc>
</url>
</urlset>
```
