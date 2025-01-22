import { type ServerBuild } from 'react-router';

export interface SeoHandle {
  seo?: {
    sitemap?: boolean;
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

export function generatePaths(tree: ServerRoute): string[] {
  const result: string[] = [];

  function traverseTree(node: ServerRoute, fullPath: string[]): void {
    if (node.children.length === 0) {
      if (node.module.handle?.seo?.sitemap !== false) {
        result.push('/' + fullPath.join('/'));
      }

      return;
    }

    for (const child of node.children) {
      if (
        child.path.some(
          (path) => path[0] === ':' || path.includes('*') || path.at(-1) === '?'
        )
      ) {
        continue;
      }

      traverseTree(child, [...fullPath, ...child.path]);
    }
  }

  traverseTree(tree, []);

  return result;
}

export function generateSitemap(
  request: Request,
  routes: ServerBuild['routes'],
  options: { url: string }
): Response {
  const paths = generatePaths(generateTree(routes));
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
