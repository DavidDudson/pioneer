import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterId, CharacterName, FeatDisplaySection } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { FeatDisplayService } from './feat-display-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryFeatDisplayRepository } from './in-memory-feat-display-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

describe('FeatDisplayService', () => {
  let characters: CharacterService;
  let display: FeatDisplayService;
  let kyra: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-13T10:00:00Z');
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const repository = new InMemoryCharacterRepository();
    characters = new CharacterService(repository, content, clock);
    display = new FeatDisplayService(repository, new InMemoryFeatDisplayRepository(), clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('grant-only feats are hidden until the user shows them', async () => {
    expect(await display.get(amiri, kyra.id)).toStrictEqual({ showGrantOnly: [] });
  });

  test('showing and hiding a section is remembered, without touching the character', async () => {
    const shown = await display.set(amiri, kyra.id, { section: FeatDisplaySection.Feats, showGrantOnly: true });
    expect(shown).toStrictEqual({ showGrantOnly: [FeatDisplaySection.Feats] });
    expect(await display.get(amiri, kyra.id)).toStrictEqual(shown);

    const hidden = await display.set(amiri, kyra.id, { section: FeatDisplaySection.Feats, showGrantOnly: false });
    expect(hidden).toStrictEqual({ showGrantOnly: [] });
    const unchanged = await characters.get(amiri, kyra.id);
    expect(unchanged.version).toBe(kyra.version);
  });

  test('each user and character has its own filter', async () => {
    const other = await characters.create(amiri, { name: CharacterName.parse('Seelah'), ancestry: humanAncestryId });
    await display.set(amiri, kyra.id, { section: FeatDisplaySection.Feats, showGrantOnly: true });
    expect(await display.get(amiri, other.id)).toStrictEqual({ showGrantOnly: [] });
  });

  test("someone else's character, or a missing one, is not found", async () => {
    const body = { section: FeatDisplaySection.Feats, showGrantOnly: true };
    expect(await rejection(display.get(ezren, kyra.id))).toBeInstanceOf(NotFoundError);
    expect(await rejection(display.set(ezren, kyra.id, body))).toBeInstanceOf(NotFoundError);
    const missing = CharacterId.parse(newId());
    expect(await rejection(display.get(amiri, missing))).toBeInstanceOf(NotFoundError);
  });
});
