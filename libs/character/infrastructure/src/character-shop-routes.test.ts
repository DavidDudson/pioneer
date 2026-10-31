import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { CharacterSheet, CoinsSchema } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { contentId, ContentKind, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, Version } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterRoutes } from './character-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const rope = contentId(PackId.parse('player-core'), EntrySlug.parse('equipment:rope'));
const climbing = contentId(PackId.parse('player-core'), EntrySlug.parse('kit:climbing'));

function app(): AnyElysia {
  const content = fixedContent(
    new ContentPackBuilder()
      .withId('player-core')
      .withAncestry('human')
      .withItem(ContentKind.Equipment, 'rope', { bulk: 'light', price: { coins: { sp: 5 } } })
      .withKit('climbing', { price: { coins: { sp: 8 } }, items: [{ item: rope, quantity: 2 }] })
      .build(),
  );
  const service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));
  return new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
}

/** A request as `as`, with `body` as JSON when given. */
interface Sent {
  readonly as: UserId;
  readonly body?: unknown;
}

function request(method: string, path: string, { as, body }: Sent): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...actingAs(as) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The part of a created character these tests need. */
interface Created {
  readonly id: string;
}

async function create(api: AnyElysia, as: UserId): Promise<Created> {
  const response = await api.handle(
    request('POST', '/characters', { as, body: { name: 'Kyra', ancestry: humanAncestryId } }),
  );
  return (await response.json()) as Created;
}

async function patch(api: AnyElysia, id: string, body: unknown): Promise<Response> {
  return api.handle(request('PATCH', `/characters/${id}`, { as: amiri, body }));
}

describe('character routes: the shop', () => {
  test('a gift adds the item without paying and bumps the version; a stale version is a 409', async () => {
    const api = app();
    const { id } = await create(api, amiri);
    const body = { expectedVersion: 1, patch: { field: 'giftItem', item: rope, quantity: 2 } };
    const gifted = await patch(api, id, body);
    expect(gifted.status).toBe(200);
    const { character } = CharacterSheet.parse(await gifted.json());
    expect(character.version).toBe(Version.parse(2));
    expect(
      character.document.inventory.items.map(({ item, quantity }) => [String(item), Number(quantity)]),
    ).toStrictEqual([[rope, 2]]);
    expect(character.document.inventory.coins).toStrictEqual(CoinsSchema.parse({}));

    const stale = await patch(api, id, body);
    expect(stale.status).toBe(409);
  });

  test('a purchase pays from the coins with change and bumps the version; a stale version is a 409', async () => {
    const api = app();
    const { id } = await create(api, amiri);
    const coins = await patch(api, id, { expectedVersion: 1, patch: { field: 'setCoins', coins: { gp: 1 } } });
    expect(coins.status).toBe(200);
    const buy = { expectedVersion: 2, patch: { field: 'buyItem', item: rope, quantity: 1 } };
    const bought = await patch(api, id, buy);
    expect(bought.status).toBe(200);
    const { character } = CharacterSheet.parse(await bought.json());
    expect(character.version).toBe(Version.parse(3));
    expect(character.document.inventory.items.map(({ item }) => String(item))).toStrictEqual([rope]);
    expect(character.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ sp: 5 }));

    const stale = await patch(api, id, buy);
    expect(stale.status).toBe(409);
  });

  test('a purchase the coins do not cover is a 422 on the quantity, and the character is unchanged', async () => {
    const api = app();
    const { id } = await create(api, amiri);
    const buy = { expectedVersion: 1, patch: { field: 'buyItem', item: rope, quantity: 2 } };
    const refused = await patch(api, id, buy);
    expect(refused.status).toBe(422);
    const problem = (await refused.json()) as Problem;
    expect(problem.issues).toStrictEqual([
      { path: ['patch', 'quantity'], message: { key: 'character.validation.cannotAfford' } },
    ]);
    const got = await api.handle(request('GET', `/characters/${id}`, { as: amiri }));
    const { character } = CharacterSheet.parse(await got.json());
    expect(character.version).toBe(Version.parse(1));
  });

  test('buying for another user’s character is a 404', async () => {
    const api = app();
    const theirs = await create(api, ezren);
    const bought = await patch(api, theirs.id, {
      expectedVersion: 1,
      patch: { field: 'buyItem', item: rope, quantity: 1 },
    });
    expect(bought.status).toBe(404);
  });
});

describe('character routes: kits', () => {
  test('a kit gift adds its items without paying, as giftKit', async () => {
    const api = app();
    const { id } = await create(api, amiri);
    const gifted = await patch(api, id, { expectedVersion: 1, patch: { field: 'giftKit', kit: climbing } });
    expect(gifted.status).toBe(200);
    const { character } = CharacterSheet.parse(await gifted.json());
    expect(
      character.document.inventory.items.map(({ item, quantity }) => [String(item), Number(quantity)]),
    ).toStrictEqual([[rope, 2]]);
    expect(character.document.inventory.coins).toStrictEqual(CoinsSchema.parse({}));
  });

  test('a kit purchase pays its price with change and bumps the version; a stale version is a 409', async () => {
    const api = app();
    const { id } = await create(api, amiri);
    await patch(api, id, { expectedVersion: 1, patch: { field: 'setCoins', coins: { gp: 1 } } });
    const buy = { expectedVersion: 2, patch: { field: 'buyKit', kit: climbing } };
    const bought = await patch(api, id, buy);
    expect(bought.status).toBe(200);
    const { character } = CharacterSheet.parse(await bought.json());
    expect(character.version).toBe(Version.parse(3));
    expect(character.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ sp: 2 }));

    const stale = await patch(api, id, buy);
    expect(stale.status).toBe(409);
  });

  test('a kit the coins do not cover is a 422 on the kit, and the character is unchanged', async () => {
    const api = app();
    const { id } = await create(api, amiri);
    const refused = await patch(api, id, { expectedVersion: 1, patch: { field: 'buyKit', kit: climbing } });
    expect(refused.status).toBe(422);
    const problem = (await refused.json()) as Problem;
    expect(problem.issues).toStrictEqual([
      { path: ['patch', 'kit'], message: { key: 'character.validation.cannotAffordKit' } },
    ]);
    const got = await api.handle(request('GET', `/characters/${id}`, { as: amiri }));
    const { character } = CharacterSheet.parse(await got.json());
    expect(character.version).toBe(Version.parse(1));
    expect(character.document.inventory.items).toStrictEqual([]);
  });
});
