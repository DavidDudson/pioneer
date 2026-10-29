import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterLevel,
  CharacterName,
  CharacterSort,
  CLASS_SLOT,
  Seed,
} from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ChoiceValue } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, SortDirection, UserId, ValidationError } from '@pioneer/shared/kernel';

import { CharacterService } from './character-service';
import { GenerateCharacterService } from './generate-character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const kyra = CharacterName.parse('Kyra');
const amiri = UserId.parse(newId());
const byName = { sort: CharacterSort.Name, direction: SortDirection.Asc } as const;

describe('GenerateCharacterService', () => {
  let characters: CharacterService;
  let service: GenerateCharacterService;
  let repository: InMemoryCharacterRepository;

  beforeEach(() => {
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    repository = new InMemoryCharacterRepository();
    const clock = fixedClock('2026-10-07T10:00:00Z');
    characters = new CharacterService(repository, content, clock);
    service = new GenerateCharacterService(repository, content, clock);
  });

  describe('from a level', () => {
    const level = CharacterLevel.parse(1);
    const seed = Seed.parse(1234);

    test('owns the character, answers with the seed and audits the generate command', async () => {
      const generated = await service.generate(amiri, { level, seed });
      expect(generated.seed).toBe(seed);
      expect(generated.character.ownerId).toBe(amiri);
      expect(repository.audits.at(-1)).toEqual({ actor: amiri, command: CharacterCommand.GenerateCharacter });
      expect(await characters.get(amiri, generated.character.id)).toEqual(generated.character);
    });

    test('the same seed and level give the same character', async () => {
      const first = await service.generate(amiri, { level, seed });
      const second = await service.generate(amiri, { level, seed });
      expect(second.character.document.name).toBe(first.character.document.name);
      expect(second.character.document.build).toEqual(first.character.document.build);
      expect(second.character.document.personality).toEqual(first.character.document.personality);
    });

    test('draws a seed when none is given, and answers with it', async () => {
      const generated = await service.generate(amiri, { level });
      const again = await service.generate(amiri, { level, seed: generated.seed });
      expect(again.character.document.build).toEqual(generated.character.document.build);
    });

    test('a given name replaces the rolled one', async () => {
      const generated = await service.generate(amiri, { level, seed, name: kyra });
      expect(generated.character.document.name).toBe(kyra);
    });

    test('leaves archived characters as they were', async () => {
      const mine = await characters.create(amiri, { name: kyra, ancestry: humanAncestryId });
      await characters.archive(amiri, mine.id);
      await service.generate(amiri, { level, seed });
      const archived = await characters.listArchived(amiri, byName);
      expect(archived.map((each) => each.id)).toEqual([mine.id]);
      expect(archived[0]?.version).toBe(FIRST_VERSION);
    });
  });

  describe('with locks', () => {
    const level = CharacterLevel.parse(1);
    const seed = Seed.parse(1234);
    const unloaded = ChoiceValue.parse(newId());

    test('refuses a lock the build cannot keep as a 422 naming it, and stores nothing', async () => {
      const locks = [{ slot: CLASS_SLOT, selection: unloaded }];
      const refusal: unknown = await service.generate(amiri, { level, seed, locks }).catch((error: unknown) => error);
      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal).toMatchObject({ issues: [{ path: ['locks', 0] }] });
      expect(await characters.list(amiri, byName)).toEqual([]);
    });
  });
});
