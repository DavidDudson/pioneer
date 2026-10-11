import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { PatchedCharacterSheet } from '@pioneer/character/domain';
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

function request(method: string, path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...actingAs(amiri) },
    body: JSON.stringify(body),
  });
}

/** The part of a created character these tests need. */
interface Created {
  readonly id: string;
}

async function created(api: AnyElysia): Promise<Created> {
  const response = await api.handle(request('POST', '/characters', { name: 'Kyra', ancestry: humanAncestryId }));
  return (await response.json()) as Created;
}

describe('character routes: the class', () => {
  test('a class opens its subclass slot; a class change keeps the subclass pick, hidden, and clears nothing', async () => {
    const namespaces = new ContentPackBuilder().withId('core-rules').withNamespace('item', NamespaceKind.Known).build();
    const content = fixedContent(namespaces, playerCoreClasses());
    const service = new CharacterService(
      new InMemoryCharacterRepository(),
      content,
      fixedClock('2026-10-07T10:00:00Z'),
    );
    const api = new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
    const { id } = await created(api);
    const select = (version: number, slot: string, selection: string): Request =>
      request('PATCH', `/characters/${id}`, {
        expectedVersion: version,
        patch: { field: 'selectSlot', slot, selection },
      });
    const sheetAfter = async (edit: Request): Promise<PatchedCharacterSheet> => {
      const response = await api.handle(edit);
      return PatchedCharacterSheet.parse(await response.json());
    };
    const cloistered = playerCoreId(ContentKind.ClassFeature, 'cloistered-cleric');
    // The Doctrine feature's first rule element is its ChoiceSet.
    const doctrine = SlotKey.parse(`${playerCoreId(ContentKind.ClassFeature, 'doctrine')}:0`);

    const asCleric = await sheetAfter(select(1, 'class', playerCoreClassId('cleric')));
    expect(asCleric.slots.find((slot) => slot.key === doctrine)).toMatchObject({
      status: 'open',
      subject: { kind: 'choice', entryName: 'Doctrine' },
    });

    const withDoctrine = await sheetAfter(select(2, doctrine, cloistered));
    expect(withDoctrine.slots.find((slot) => slot.key === doctrine)).toMatchObject({
      status: 'filled',
      selectionName: 'Cloistered Cleric',
    });

    const asWizard = await sheetAfter(select(3, 'class', playerCoreClassId('wizard')));
    expect(asWizard.cleared).toEqual([]);
    expect(String(asWizard.character.document.build.choices[doctrine])).toBe(cloistered);
    expect(asWizard.slots.find((slot) => slot.key === doctrine)).toMatchObject({ status: 'hidden' });
  });
});
