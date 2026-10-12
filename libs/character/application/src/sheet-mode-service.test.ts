import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterId, CharacterName, SheetMode } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemorySheetModeRepository } from './in-memory-sheet-mode-repository';
import { SheetModeService } from './sheet-mode-service';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

describe('SheetModeService', () => {
  let characters: CharacterService;
  let modes: SheetModeService;
  let kyra: Character;

  beforeEach(async () => {
    const clock = fixedClock('2026-10-12T10:00:00Z');
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const repository = new InMemoryCharacterRepository();
    characters = new CharacterService(repository, content, clock);
    modes = new SheetModeService(repository, new InMemorySheetModeRepository(), clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('a character whose tab was never switched has none remembered', async () => {
    expect(await modes.get(amiri, kyra.id)).toStrictEqual({});
  });

  test('the last tab switched to is remembered, without touching the character', async () => {
    await modes.set(amiri, kyra.id, { mode: SheetMode.Encounter });
    const answer = await modes.set(amiri, kyra.id, { mode: SheetMode.Downtime });
    expect(answer).toStrictEqual({ mode: SheetMode.Downtime });
    expect(await modes.get(amiri, kyra.id)).toStrictEqual({ mode: SheetMode.Downtime });
    const unchanged = await characters.get(amiri, kyra.id);
    expect(unchanged.version).toBe(kyra.version);
  });

  test('each character remembers its own tab', async () => {
    const other = await characters.create(amiri, { name: CharacterName.parse('Seelah'), ancestry: humanAncestryId });
    await modes.set(amiri, kyra.id, { mode: SheetMode.Exploration });
    expect(await modes.get(amiri, other.id)).toStrictEqual({});
  });

  test("someone else's character, or a missing one, is not found", async () => {
    expect(await rejection(modes.get(ezren, kyra.id))).toBeInstanceOf(NotFoundError);
    expect(await rejection(modes.set(ezren, kyra.id, { mode: SheetMode.Plan }))).toBeInstanceOf(NotFoundError);
    const missing = CharacterId.parse(newId());
    expect(await rejection(modes.get(amiri, missing))).toBeInstanceOf(NotFoundError);
  });
});
