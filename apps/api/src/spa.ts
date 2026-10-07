import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

/** Serve the built Angular app, falling back to index.html for client routes. */
export function spa(root: string): AnyElysia {
  const index = Bun.file(`${root}/index.html`);
  return new Elysia({ name: 'spa' }).get('/*', async ({ path }) => {
    if (path.includes('..')) {
      return index;
    }
    const file = Bun.file(`${root}${path}`);
    return (await file.exists()) ? file : index;
  });
}
