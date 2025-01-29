import { type ServerBuild } from 'react-router';

export interface SeoHandle {
  seo?: {
    sitemap?: boolean;
    generateSitemapEntries?: (
      request: Request
    ) => Promise<{ path: string }[]> | { path: string }[];
  };
}

interface Route {
  index?: boolean;
  caseSensitive?: boolean;
  id: string;
  parentId?: string;
  path: string[];
}

interface ServerRoute extends Route {
  children: ServerRoute[];
  module: ServerRouteModule;
}

interface ServerRouteModule {
  handle?: SeoHandle;
}

export function generateTree(routes: ServerBuild['routes']): ServerRoute {
  const serverRoutes: Record<string, ServerRoute> = {};

  for (const [key, value] of Object.entries(routes)) {
    if (value) {
      serverRoutes[key] = {
        ...value,
        path: value.path?.split('/').filter(Boolean) || [],
        children: [],
      } as ServerRoute;
    }
  }

  for (const route of Object.values(serverRoutes)) {
    if (route.parentId) {
      serverRoutes[route.parentId].children.push(route);
    } else {
      serverRoutes[route.id] = route;
    }
  }

  return serverRoutes.root;
}

function expandOptionals(path: string[]): string[][] {
  let results: string[][] = [[]];

  for (const segment of path) {
    if (segment.at(-1) === '?') {
      const base = segment.substring(0, segment.length - 1);

      for (let i = 0, len = results.length; i < len; i++) {
        results.push([...results[i], base]);
      }
    } else {
      for (let i = 0, len = results.length; i < len; i++) {
        results[i].push(segment);
      }
    }
  }

  return results;
}

export async function generatePaths(
  tree: ServerRoute,
  request: Request
): Promise<string[]> {
  const result: string[] = [];

  async function traverseTree(
    node: ServerRoute,
    fullPath: string[]
  ): Promise<void> {
    if (node.children.length === 0) {
      if (node.module.handle?.seo?.sitemap !== false) {
        if (node.module.handle?.seo?.generateSitemapEntries) {
          const entries = await node.module.handle.seo.generateSitemapEntries(
            request
          );
          entries.forEach((entry) => {
            result.push(entry.path);
          });
        } else if (
          fullPath.every(
            (segment) => segment[0] !== ':' && !segment.includes('*')
          )
        ) {
          result.push('/' + fullPath.join('/'));
        }
      }

      return;
    }

    for (const child of node.children) {
      for (const segments of expandOptionals(child.path)) {
        await traverseTree(child, [...fullPath, ...segments]);
      }
    }
  }

  await traverseTree(tree, []);

  return result;
}

export async function generateSitemap(
  request: Request,
  routes: ServerBuild['routes'],
  options: { url: string }
): Promise<Response> {
  const paths = Array.from(
    new Set(await generatePaths(generateTree(routes), request))
  );
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map((path) =>
    `<url>
  <loc>
    ${new URL(path, options.url).href}
  </loc>
</url>`.trim()
  )
  .join('\n')}
</urlset>
`.trim();
  const bytes = new TextEncoder().encode(sitemap).byteLength;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Content-Length': String(bytes),
    },
  });
}
