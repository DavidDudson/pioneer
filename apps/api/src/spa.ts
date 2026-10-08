import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

/** Build outputs with a content hash in the name (`chunk-BgoYYQMx.js`, `main-PD76EBGL.js`) never change. */
const HASHED_ASSET = /-[\w-]{8}\.(?:css|js)$/u;
const IMMUTABLE = 'public, max-age=31536000, immutable';
/** The index.html file and unhashed files must revalidate so a deploy is picked up. */
const REVALIDATE = 'no-cache';

function serve(file: Blob, cacheControl: string): Response {
  return new Response(file, { headers: { 'cache-control': cacheControl } });
}

/** Serve the built Angular app, falling back to index.html for client routes. */
export function spa(root: string): AnyElysia {
  const index = Bun.file(`${root}/index.html`);
  return new Elysia({ name: 'spa' }).get('/*', async ({ path }) => {
    if (path.includes('..')) {
      return serve(index, REVALIDATE);
    }
    const file = Bun.file(`${root}${path}`);
    const fileExists = await file.exists();
    if (!fileExists) {
      return serve(index, REVALIDATE);
    }
    return serve(file, HASHED_ASSET.test(path) ? IMMUTABLE : REVALIDATE);
  });
}
