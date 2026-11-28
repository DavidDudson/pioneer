import { describe, expect, test } from 'bun:test';

import type { Problem } from '@pioneer/shared/kernel';
import type { AnyElysia } from 'elysia';
import * as z from 'zod';

import { app, ezren, feats, makePack, request } from './testing/homebrew-route-fixtures';

const EntryJson = z.object({
  id: z.string(),
  kind: z.string(),
  slug: z.string(),
  name: z.string(),
  archivedAt: z.string().optional(),
});

/** The entries a GET on `path` lists. */
async function listed(api: AnyElysia, path: string): Promise<Array<z.infer<typeof EntryJson>>> {
  const response = await api.handle(request('GET', path));

  return z.array(EntryJson).parse(await response.json());
}

const rendingStrike = { kind: 'feat', name: 'Rending Strike', level: 1, rarity: 'common', traits: ['fighter'] };

describe('homebrew entry routes', () => {
  test('the author creates, edits, archives and restores an entry, and the pack lists it', async () => {
    const api = app();
    const pack = await makePack(api);
    const path = `/homebrew/packs/${pack.id}/entries`;

    const created = await api.handle(request('POST', path, { body: rendingStrike }));
    expect(created.status).toBe(200);
    const entry = EntryJson.parse(await created.json());
    expect(entry).toMatchObject({ kind: 'feat', slug: 'feat:rending-strike' });

    const edited = await api.handle(
      request('PATCH', `${path}/${entry.id}`, { body: { ...rendingStrike, name: 'Rending Blow' } }),
    );

    expect(EntryJson.parse(await edited.json())).toMatchObject({
      id: entry.id,
      slug: 'feat:rending-strike',
      name: 'Rending Blow',
    });

    await api.handle(request('POST', `${path}/${entry.id}/archive`));
    const live = await listed(api, path);
    const archived = await listed(api, `${path}?archived=true`);
    expect(live).toStrictEqual([]);
    expect(archived.map(({ id }) => id)).toStrictEqual([entry.id]);

    await api.handle(request('POST', `${path}/${entry.id}/restore`));
    const restored = await listed(api, path);
    expect(restored.map(({ id }) => id)).toStrictEqual([entry.id]);
  });

  test('another user gets 404 on every entry route', async () => {
    const api = app();
    const pack = await makePack(api);
    const path = `/homebrew/packs/${pack.id}/entries`;
    const created = await api.handle(request('POST', path, { body: rendingStrike }));
    const entry = EntryJson.parse(await created.json());

    const statuses = await Promise.all([
      api.handle(request('GET', path, { as: ezren })),
      api.handle(request('POST', path, { as: ezren, body: rendingStrike })),
      api.handle(request('PATCH', `${path}/${entry.id}`, { as: ezren, body: rendingStrike })),
      api.handle(request('POST', `${path}/${entry.id}/archive`, { as: ezren })),
      api.handle(request('POST', `${path}/${entry.id}/restore`, { as: ezren })),
    ]);

    expect(statuses.map(({ status }) => status)).toStrictEqual([404, 404, 404, 404, 404]);
  });

  test('a name the kind already holds is 409 with a message key', async () => {
    const api = app();
    const pack = await makePack(api, undefined, feats);
    const path = `/homebrew/packs/${pack.id}/entries`;
    await api.handle(request('POST', path, { body: rendingStrike }));

    const response = await api.handle(request('POST', path, { body: rendingStrike }));

    expect(response.status).toBe(409);
    // SAFETY: the API's error handler answers failures with an RFC 9457 `Problem` body, and the status asserted above is such a failure.
    expect(((await response.json()) as Problem).message).toStrictEqual({ key: 'homebrew.entry.slugTaken' });
  });

  test('a level the kind refuses is 422', async () => {
    const api = app();
    const pack = await makePack(api);

    const response = await api.handle(
      request('POST', `/homebrew/packs/${pack.id}/entries`, { body: { ...rendingStrike, level: undefined } }),
    );

    expect(response.status).toBe(422);
  });
});
