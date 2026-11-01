import { beforeEach, describe, expect, test } from 'bun:test';

import { CHARACTER_LEVEL_MIN, CharacterLevel, CLASS_SLOT, Seed } from '@pioneer/character/domain';
import { ChoiceValue, ContentKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';

import { GenerateCharacterService } from './generate-character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const seed = Seed.parse(1234);

const pack = new ContentPackBuilder()
  .withId('player-core')
  .withAncestry('human')
  .withClass('fighter', ['str'], { roles: ['melee', 'tank'] })
  .withClass('wizard', ['int'], { roles: ['spellcaster'] })
  .withClass('commoner', ['str']);
const fighter = ChoiceValue.parse(pack.idOf(ContentKind.Class, 'fighter'));
const wizard = ChoiceValue.parse(pack.idOf(ContentKind.Class, 'wizard'));

describe('GenerateCharacterService with a role', () => {
  let service: GenerateCharacterService;

  beforeEach(() => {
    const content = fixedContent(pack.build());
    service = new GenerateCharacterService(
      new InMemoryCharacterRepository(),
      content,
      fixedClock('2026-10-07T10:00:00Z'),
    );
  });

  test('picks a class that plays the role', async () => {
    const generated = await service.generate(amiri, { role: 'spellcaster', seed });
    expect(generated.character.document.build.choices[CLASS_SLOT]).toBe(wizard);
  });

  test('picks the same class for the same seed', async () => {
    const first = await service.generate(amiri, { role: 'tank', seed });
    const second = await service.generate(amiri, { role: 'tank', seed });
    expect(second.character.document.build.choices[CLASS_SLOT]).toBe(
      first.character.document.build.choices[CLASS_SLOT],
    );
  });

  test('makes a level 1 character when no level is given', async () => {
    const generated = await service.generate(amiri, { role: 'melee', seed });
    expect(generated.character.document.level).toBe(CharacterLevel.parse(CHARACTER_LEVEL_MIN));
  });

  test('keeps a class that is locked, whatever the role', async () => {
    const locks = [{ slot: CLASS_SLOT, selection: fighter }];
    const generated = await service.generate(amiri, { role: 'spellcaster', seed, locks });
    expect(generated.character.document.build.choices[CLASS_SLOT]).toBe(fighter);
  });

  test('refuses a role no class plays as a 422 naming it', async () => {
    const refusal: unknown = await service.generate(amiri, { role: 'healer', seed }).catch((error: unknown) => error);
    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal).toMatchObject({ issues: [{ path: ['role'] }] });
  });
});
