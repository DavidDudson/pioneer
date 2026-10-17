import { beforeEach, describe, expect, test } from 'bun:test';

import { CreateKeyItemBody, KeyItemId as CampaignKeyItemId } from '@pioneer/campaign/domain';
import type { CampaignKeyItem } from '@pioneer/campaign/domain';
import { CharacterKeyItems, CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { CharacterName } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, Temporal, UserId } from '@pioneer/shared/kernel';

import { CharacterKeyItemHolders, lineOf } from './character-key-item-holders';

const amiri = UserId.parse(newId());
const gm = UserId.parse(newId());

/** The most a key item can state: every rune at its top grade and a property rune past the table's cap. */
const stated = CreateKeyItemBody.parse({
  name: 'Caliburn',
  base: { item: newId(), name: 'Longsword' },
  runes: {
    potency: 4,
    striking: 4,
    resilient: 4,
    reinforcing: 6,
    property: Array.from({ length: 6 }, () => ({ rune: newId(), name: 'Flaming' })),
  },
  notes: '',
});

const caliburn: CampaignKeyItem = {
  id: CampaignKeyItemId.parse(newId()),
  ...stated,
  holder: undefined,
  createdAt: Temporal.Instant.from('2026-10-17T10:00:00Z'),
};

describe('the key item holders over the character context', () => {
  let repository: InMemoryCharacterRepository;
  let holders: CharacterKeyItemHolders;
  let kyra: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-17T10:00:00Z');
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    repository = new InMemoryCharacterRepository();
    holders = new CharacterKeyItemHolders(new CharacterKeyItems(repository, clock));
    kyra = await new CharacterService(repository, content, clock).create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
  });

  test('the line carries what the campaign states, named for the key item, linked to it', () => {
    const line = lineOf(caliburn);

    expect(line).toMatchObject({ keyItem: caliburn.id, item: caliburn.base.item, name: 'Caliburn', quantity: 1 });
    expect(line.runes?.property).toStrictEqual(caliburn.runes.property.map(({ rune }) => rune));
  });

  test('the top grades the campaign allows are ones the inventory stores', () => {
    expect(lineOf(caliburn).runes).toMatchObject({ potency: 4, striking: 4, resilient: 4, reinforcing: 6 });
  });

  test('giving puts the line in the holder’s inventory, and taking back removes it', async () => {
    await holders.give(gm, kyra.id, caliburn);
    const given = await repository.findById(kyra.id);
    await holders.takeBack(gm, kyra.id, caliburn);
    const taken = await repository.findById(kyra.id);

    expect(given?.document.inventory.items.map(({ keyItem }) => keyItem)).toStrictEqual([caliburn.id]);
    expect(taken?.document.inventory.items).toStrictEqual([]);
  });
});
