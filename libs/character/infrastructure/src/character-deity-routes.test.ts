import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { CharacterSheet, PatchedCharacterSheet } from '@pioneer/character/domain';
import { humanAncestryId, playerCoreClasses, playerCoreClassId, playerCoreId } from '@pioneer/character/domain/testing';
import { ContentKind, NamespaceKind, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterRoutes } from './character-routes';

const amiri = UserId.parse(newId());

const EDICTS = [{ type: 'paragraph', content: [{ type: 'text', text: 'Edicts protect allies' }] }];

const deities = new ContentPackBuilder()
  .withId('deities')
  .withDeity('sarenrae', { sanctification: { modal: 'can', what: ['holy'] }, font: ['heal'], description: EDICTS });

function request(method: string, path: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...actingAs(amiri) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The part of a created character these tests need. */
interface Created {
  readonly id: string;
}

function api(): AnyElysia {
  const namespaces = new ContentPackBuilder().withId('core-rules').withNamespace('item', NamespaceKind.Known).build();
  const content = fixedContent(namespaces, playerCoreClasses(), deities.build());
  const service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-12T10:00:00Z'));
  return new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
}

describe('character routes: the deity', () => {
  test('a picked deity is on the sheet with its description, and opens a cleric its divine font', async () => {
    const routes = api();
    const createdResponse = await routes.handle(
      request('POST', '/characters', { name: 'Kyra', ancestry: humanAncestryId }),
    );
    const { id } = (await createdResponse.json()) as Created;
    const select = async (version: number, slot: string, selection: string): Promise<PatchedCharacterSheet> => {
      const patch = { expectedVersion: version, patch: { field: 'selectSlot', slot, selection } };
      const response = await routes.handle(request('PATCH', `/characters/${id}`, patch));
      return PatchedCharacterSheet.parse(await response.json());
    };
    const sarenrae = deities.idOf(ContentKind.Deity, 'sarenrae');
    // Divine Font's first rule element is its ChoiceSet.
    const divineFont = SlotKey.parse(`${playerCoreId(ContentKind.ClassFeature, 'divine-font')}:0`);

    const asCleric = await select(1, 'class', playerCoreClassId('cleric'));
    expect(asCleric.deity).toBeUndefined();
    expect(asCleric.slots.find((slot) => slot.key === 'deity')?.status).toBe('open');

    await select(2, 'deity', sarenrae);
    const response = await routes.handle(request('GET', `/characters/${id}`));
    const sheet = CharacterSheet.parse(await response.json());
    expect(sheet.deity).toMatchObject({ name: 'Sarenrae', description: EDICTS, data: { font: ['heal'] } });

    const withFont = await select(3, divineFont, 'heal');
    expect(withFont.slots.find((slot) => slot.key === divineFont)).toMatchObject({
      status: 'filled',
      selectionName: 'Healing',
    });
  });
});
