import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterName,
  PlayCommandField,
  SpendCount,
  SpendId,
  SpendKind,
  SpendTime,
  TurnCommandField,
} from '@pioneer/character/domain';
import type { Character, PlayCommand, SpendCost, TurnCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentId, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, FIRST_VERSION, newId, nextVersion, UserId, ValidationError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-16T10:00:00Z');
const STRIKE = ContentId.parse(newId());

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
    .build(),
);

function actions(count: number): SpendCost {
  return { kind: SpendKind.Actions, count: SpendCount.parse(count) };
}

function spend(cost: SpendCost, id = SpendId.parse(newId())): PlayCommand {
  return { field: PlayCommandField.SpendAction, id, action: STRIKE, cost };
}

describe('PlayService spends', () => {
  let play: PlayService;
  let kyra: Character;
  let revision: Version;

  beforeEach(async () => {
    const repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
    revision = FIRST_VERSION;
    await patch({ field: TurnCommandField.StartTurn });
  });

  async function patch(command: PlayCommand | TurnCommand): Promise<void> {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: revision, command });
    ({ revision } = saved);
  }

  test('a spend is logged with the time the server stamped it', async () => {
    const command = spend(actions(2));
    await patch(command);
    const stored = await play.get(amiri, kyra.id);
    expect(stored.revision).toBe(nextVersion(nextVersion(FIRST_VERSION)));
    expect(stored.play.spendLog).toHaveLength(1);
    expect(stored.play.spendLog[0]?.at).toBe(SpendTime.parse('2026-10-16T10:00:00Z'));
  });

  test('spending more than is left is refused and nothing is written', async () => {
    await patch(spend(actions(2)));
    const command = spend(actions(2));
    const attempt = play.patch(amiri, kyra.id, { expectedRevision: revision, command });
    const refused = await rejection(attempt);
    expect(refused).toBeInstanceOf(ValidationError);
    const stored = await play.get(amiri, kyra.id);
    expect(stored.revision).toBe(revision);
    expect(stored.play.spendLog).toHaveLength(1);
  });

  test('undoing a spend takes it out of the log', async () => {
    const id = SpendId.parse(newId());
    await patch(spend(actions(3), id));
    await patch({ field: PlayCommandField.UndoSpend, id });
    const stored = await play.get(amiri, kyra.id);
    expect(stored.play.spendLog).toEqual([]);
  });
});
