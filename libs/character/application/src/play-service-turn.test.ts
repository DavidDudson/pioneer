import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  ConditionInstanceId,
  TurnCommandField,
  TurnEventKind,
  TurnPhase,
  UNLIMITED,
} from '@pioneer/character/domain';
import type { ActiveCondition, Character, PlayEdit } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { ConditionValue, ContentId, ContentKind, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, FIRST_VERSION, newId, UserId } from '@pioneer/shared/kernel';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-13T10:00:00Z');
const SLOWED = 'slowed';
const QUICKENED = 'quickened';

const builder = new ContentPackBuilder()
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
  .withCondition(SLOWED, [], { valued: true })
  .withCondition(QUICKENED);
const content = fixedContent(builder.build());

const held = (slug: string, value?: number): ActiveCondition => ({
  id: ConditionInstanceId.parse(newId()),
  condition: ContentId.parse(builder.idOf(ContentKind.Condition, slug)),
  value: value === undefined ? undefined : ConditionValue.parse(value),
  duration: UNLIMITED,
});

const startTurn: PlayEdit = { field: TurnCommandField.StartTurn };
const endTurn: PlayEdit = { field: TurnCommandField.EndTurn };
const leaveEncounter: PlayEdit = { field: TurnCommandField.LeaveEncounter };

describe('PlayService turn cycle', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('a character starts out of the encounter', async () => {
    const stored = await play.get(amiri, kyra.id);
    expect(stored.play.turn.phase).toBe(TurnPhase.OutOfEncounter);
  });

  test('Start turn refills 3 actions and the reaction, says the turn began and is audited', async () => {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: startTurn });
    expect(saved.play.turn).toMatchObject({ phase: TurnPhase.Turn, actions: 3, quickened: 0, reactionUsed: false });
    expect(saved.events.map(({ kind }) => kind)).toEqual([TurnEventKind.TurnStart]);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.StartTurn);
  });

  test('Start turn takes slowed from the actions and gives the quickened one on its own', async () => {
    const slowed = await play.patch(amiri, kyra.id, {
      expectedRevision: FIRST_VERSION,
      command: { field: 'addCondition', condition: held(SLOWED, 1) },
    });
    const quickened = await play.patch(amiri, kyra.id, {
      expectedRevision: slowed.revision,
      command: { field: 'addCondition', condition: held(QUICKENED) },
    });
    const started = await play.patch(amiri, kyra.id, { expectedRevision: quickened.revision, command: startTurn });
    expect(started.play.turn).toMatchObject({ actions: 2, quickened: 1 });
  });

  test('End turn drops the actions and goes off-turn, and Leave encounter ends the cycle', async () => {
    const started = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: startTurn });
    const ended = await play.patch(amiri, kyra.id, { expectedRevision: started.revision, command: endTurn });
    expect(ended.play.turn).toMatchObject({ phase: TurnPhase.OffTurn, actions: 0 });
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.EndTurn);
    const left = await play.patch(amiri, kyra.id, { expectedRevision: ended.revision, command: leaveEncounter });
    expect(left.play.turn.phase).toBe(TurnPhase.OutOfEncounter);
    expect(left.events).toEqual([]);
  });
});
