import { beforeEach, describe, expect, test } from 'bun:test';

import { Character, CharacterName, ConditionInstanceId, Dying, FRESH_PLAY, Wounded } from '@pioneer/character/domain';
import type { ActiveCondition, PlayState } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import { ConditionValue, ContentId, ContentKind, HitPoints, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { CharacterService } from './character-service';
import { CharacterVitals } from './character-vitals';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-13T10:00:00Z');
const DRAINED = 'drained';

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
  .withCondition(DRAINED, [], { valued: true });
const content = fixedContent(builder.build());

const drained: ActiveCondition = {
  id: ConditionInstanceId.parse(newId()),
  condition: ContentId.parse(builder.idOf(ContentKind.Condition, DRAINED)),
  value: ConditionValue.parse(1),
  duration: { kind: 'unlimited' },
};

function played(character: Character, play: Partial<PlayState>): Character {
  return new Character({
    document: { ...character.document, play: { ...FRESH_PLAY, ...play } },
    version: character.version,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  });
}

describe('CharacterVitals', () => {
  const vitals = new CharacterVitals(content);
  let kyra: Character;

  beforeEach(async () => {
    const characters = new CharacterService(new InMemoryCharacterRepository(), content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('a healthy character is at its maximum, not dying and carrying nothing', async () => {
    const seen = await vitals.of(kyra);
    expect(seen.hp?.current).toBe(seen.hp?.max);
    expect(seen).toMatchObject({ dying: 0, conditions: [] });
  });

  test('damage lowers the current Hit Points and temporary points are reported', async () => {
    const damage = HitPoints.parse(3);
    const temp = HitPoints.parse(2);
    const seen = await vitals.of(played(kyra, { hp: { damage, temp } }));
    expect(seen.hp).toStrictEqual({
      current: HitPoints.parse(HUMAN_HIT_POINTS - damage),
      max: HitPoints.parse(HUMAN_HIT_POINTS),
      temp,
    });
  });

  test('lists the death track first, then the active conditions, each once', async () => {
    const seen = await vitals.of(
      played(kyra, { dying: Dying.parse(2), wounded: Wounded.parse(1), conditions: [drained, drained] }),
    );
    expect(seen.conditions).toStrictEqual(['dying', 'wounded', DRAINED]);
    expect(seen.dying).toBe(Dying.parse(2));
  });

  test('a dead character is at the highest dying value', async () => {
    const seen = await vitals.of(played(kyra, { dead: true }));
    expect(seen.dying).toBe(Dying.parse(4));
  });

  test('a build with no ancestry or class has no Hit Points', async () => {
    const bare = new CharacterVitals(fixedContent(new ContentPackBuilder().withId('bare').build()));
    const seen = await bare.of(kyra);
    expect(seen.hp).toBeUndefined();
  });
});
