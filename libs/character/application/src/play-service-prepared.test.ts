import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, PlayCommandField } from '@pioneer/character/domain';
import type { Character, CharacterPlay, PlayCommand } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  playerCoreClasses,
  playerCoreClassId,
  spellFixtureId,
  spellFixtures,
} from '@pioneer/character/domain/testing';
import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, FIRST_VERSION, ValidationError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const clock = fixedClock('2026-10-13T10:00:00Z');

const KEY_ATTRIBUTE = 'boost:1:class:0';
const THIRD_RANK = SlotKey.parse('prepared:wizard:3:0');
const FIRST_RANK = SlotKey.parse('prepared:wizard:1:0');

const FIREBALL = ChoiceValue.parse(spellFixtureId('fireball'));
const BARRAGE = ChoiceValue.parse(spellFixtureId('force-barrage'));

/** A 5th-level wizard preparing Force Barrage in a 3rd-rank slot. */
function wizard(): Character {
  return new CharacterBuilder()
    .named('Ezren')
    .atLevel(5)
    .picking('class', playerCoreClassId('wizard'))
    .picking(KEY_ATTRIBUTE, 'str')
    .picking(THIRD_RANK, spellFixtureId('force-barrage'))
    .build();
}

describe('PlayService daily preparations changing prepared spells', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let ezren: Character;
  let revision: Version;

  async function patch(command: PlayCommand): Promise<CharacterPlay> {
    const saved = await play.patch(ezren.ownerId, ezren.id, { expectedRevision: revision, command });
    ({ revision } = saved);
    return saved;
  }

  async function refused(command: PlayCommand): Promise<unknown> {
    return rejection(play.patch(ezren.ownerId, ezren.id, { expectedRevision: revision, command }));
  }

  async function choice(slot: SlotKey): Promise<string | undefined> {
    const stored = await repository.findById(ezren.id);
    return stored?.document.build.choices[slot];
  }

  beforeEach(async () => {
    const content = fixedContent(playerCoreClasses(), spellFixtures());
    repository = new InMemoryCharacterRepository();
    play = new PlayService(repository, content, clock);
    const built = wizard();
    ezren = await repository.insert(built, { actor: built.ownerId, command: CharacterCommand.CreateCharacter });
    revision = FIRST_VERSION;
  });

  test('replaces the build pick of the slot and is audited as daily preparations', async () => {
    await patch({
      field: PlayCommandField.DailyPreparations,
      prepared: [{ slot: THIRD_RANK, selection: FIREBALL }],
    });

    expect(await choice(THIRD_RANK)).toBe(FIREBALL);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.DailyPreparations);
  });

  test('changes several slots in the one command', async () => {
    await patch({
      field: PlayCommandField.DailyPreparations,
      prepared: [
        { slot: THIRD_RANK, selection: FIREBALL },
        { slot: FIRST_RANK, selection: BARRAGE },
      ],
    });

    expect(await choice(THIRD_RANK)).toBe(FIREBALL);
    expect(await choice(FIRST_RANK)).toBe(BARRAGE);
  });

  test('leaves the build as it is when no spell is changed', async () => {
    await patch({ field: PlayCommandField.DailyPreparations });

    expect(await choice(THIRD_RANK)).toBe(BARRAGE);
  });

  test('refuses a spell the slot does not offer, changing nothing', async () => {
    const error = await refused({
      field: PlayCommandField.DailyPreparations,
      prepared: [
        { slot: THIRD_RANK, selection: FIREBALL },
        { slot: FIRST_RANK, selection: FIREBALL },
      ],
    });

    expect(error).toBeInstanceOf(ValidationError);
    expect(await choice(THIRD_RANK)).toBe(BARRAGE);
    expect(await choice(FIRST_RANK)).toBeUndefined();
  });

  test('refuses a slot that is not a prepared slot', async () => {
    const error = await refused({
      field: PlayCommandField.DailyPreparations,
      prepared: [{ slot: SlotKey.parse(KEY_ATTRIBUTE), selection: FIREBALL }],
    });

    expect(error).toBeInstanceOf(ValidationError);
  });

  test('refuses a slot named twice', async () => {
    const error = await refused({
      field: PlayCommandField.DailyPreparations,
      prepared: [
        { slot: THIRD_RANK, selection: FIREBALL },
        { slot: THIRD_RANK, selection: BARRAGE },
      ],
    });

    expect(error).toBeInstanceOf(ValidationError);
  });
});
