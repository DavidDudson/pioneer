import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  ConditionInstanceId,
  FRESH_PLAY,
  PlayCommandField,
  untypedDamage,
} from '@pioneer/character/domain';
import type { ActiveCondition, Character, PlayCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { ConditionValue, ContentId, ContentKind, HitPoints, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, nextVersion, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-13T10:00:00Z');
const DRAINED = 'drained';
const BLINDED = 'blinded';

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
  .withCondition(
    DRAINED,
    [{ key: 'FlatModifier', selectors: ['hp'], type: 'untyped', slug: DRAINED, value: '-@item.value' }],
    { valued: true },
  )
  .withCondition(BLINDED);
const content = fixedContent(builder.build());

const drained = (value: number): ActiveCondition => ({
  id: ConditionInstanceId.parse(newId()),
  condition: ContentId.parse(builder.idOf(ContentKind.Condition, DRAINED)),
  value: ConditionValue.parse(value),
  duration: { kind: 'unlimited' },
});

const add = (condition: ActiveCondition): PlayCommand => ({ field: PlayCommandField.AddCondition, condition });

describe('PlayService conditions', () => {
  let repository: InMemoryCharacterRepository;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('adding a condition keeps it, bumps the play revision and is audited by name', async () => {
    const condition = drained(2);
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: add(condition) });
    expect(saved.revision).toBe(nextVersion(FIRST_VERSION));
    expect(saved.play.conditions).toEqual([condition]);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.AddCondition);
  });

  test('a character with no conditions has none', async () => {
    const stored = await play.get(amiri, kyra.id);
    expect(stored.play.conditions).toEqual(FRESH_PLAY.conditions);
  });

  test('a condition the content lacks is refused', async () => {
    const unknown = { ...drained(1), condition: ContentId.parse(builder.idOf(ContentKind.Feat, 'missing')) };
    const refused = rejection(play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: add(unknown) }));
    expect(await refused).toBeInstanceOf(ValidationError);
  });

  test('a valued condition without a value is refused', async () => {
    const valueless = { ...drained(1), value: undefined };
    const refused = rejection(play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: add(valueless) }));
    expect(await refused).toBeInstanceOf(ValidationError);
  });

  test('removing a condition the character lacks is refused', async () => {
    const command: PlayCommand = { field: PlayCommandField.RemoveCondition, id: ConditionInstanceId.parse(newId()) };
    const refused = rejection(play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command }));
    expect(await refused).toBeInstanceOf(ValidationError);
  });

  test('a condition lowers the maximum Hit Points the engine derives, so damage is held to it', async () => {
    const condition = drained(2);
    const added = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: add(condition) });
    const down: PlayCommand = { field: PlayCommandField.Damage, damage: untypedDamage(HitPoints.parse(50)) };
    const hurt = await play.patch(amiri, kyra.id, { expectedRevision: added.revision, command: down });
    expect(hurt.play.hp.damage).toBe(HitPoints.parse(HUMAN_HIT_POINTS - 2));
    const remove: PlayCommand = { field: PlayCommandField.RemoveCondition, id: condition.id };
    const removed = await play.patch(amiri, kyra.id, { expectedRevision: hurt.revision, command: remove });
    expect(removed.play.conditions).toEqual([]);
  });
});
