import { beforeEach, describe, expect, test } from 'bun:test';

import {
  AirRounds,
  CharacterCommand,
  CharacterName,
  PlayCommandField,
  SuffocationChecks,
  TurnCommandField,
} from '@pioneer/character/domain';
import type { Character, PlayCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, FIRST_VERSION, newId, nextVersion, UserId } from '@pioneer/shared/kernel';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-26T10:00:00Z');

const content = fixedContent(
  new ContentPackBuilder()
    .withId('player-core')
    .withAncestry('human', { hitPoints: HUMAN_HIT_POINTS })
    .withStatistic('hp-max', {
      name: 'Hit Points',
      selector: 'hp:max',
      domains: ['hp'],
      base: '@ancestry.hp',
      kind: StatisticKind.Value,
    })
    .withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS)
    .withCondition('unconscious')
    .build(),
);

const hold = (air: number): PlayCommand => ({
  field: PlayCommandField.SetBreath,
  air: AirRounds.parse(air),
  checks: SuffocationChecks.parse(0),
});

describe('PlayService breath', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('a held breath is remembered, bumps the revision and is audited by name', async () => {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: hold(7) });

    expect(saved.revision).toBe(nextVersion(FIRST_VERSION));
    expect(saved.play.breath).toStrictEqual({ air: AirRounds.parse(7), checks: SuffocationChecks.parse(0) });
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SetBreath);
  });

  test('breathing again clears it, which undoes holding the breath', async () => {
    const first = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: hold(7) });
    await play.patch(amiri, kyra.id, {
      expectedRevision: first.revision,
      command: { field: PlayCommandField.ClearBreath },
    });
    const stored = await play.get(amiri, kyra.id);

    expect(stored.play.breath).toBeUndefined();
  });

  test('the turn cycle spends the air: ending a turn holding a breath loses a round', async () => {
    const held = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: hold(5) });
    const entered = await play.patch(amiri, kyra.id, {
      expectedRevision: held.revision,
      command: { field: TurnCommandField.EnterEncounter },
    });
    const started = await play.patch(amiri, kyra.id, {
      expectedRevision: entered.revision,
      command: { field: TurnCommandField.StartTurn },
    });
    const ended = await play.patch(amiri, kyra.id, {
      expectedRevision: started.revision,
      command: { field: TurnCommandField.EndTurn },
    });

    expect(ended.play.breath).toStrictEqual({ air: AirRounds.parse(4), checks: SuffocationChecks.parse(0) });
  });

  test('setting the air to none puts Unconscious on the character at once, and breathing again takes it off', async () => {
    const out = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: hold(0) });
    const instance = out.play.breath?.unconscious;

    expect(out.play.conditions).toHaveLength(1);
    expect(out.play.conditions.map(({ id }) => id)).toEqual([instance]);

    const breathing = await play.patch(amiri, kyra.id, { expectedRevision: out.revision, command: hold(5) });

    expect(breathing.play.conditions).toEqual([]);
    expect(breathing.play.breath?.unconscious).toBeUndefined();
  });
});
