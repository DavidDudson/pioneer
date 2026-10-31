import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterName,
  characterStatisticInputs,
  characterStatistics,
  NO_EFFECTS,
  slotContent,
  turnCommandInputs,
} from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, humanAncestryId } from '@pioneer/character/domain/testing';
import type { StatisticResult } from '@pioneer/rules/engine';
import { HitPoints, Selector, StatisticKind } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { NO_VALUED, turnLimits } from './play-defaults';

const amiri = UserId.parse(newId());
const SAVE = Selector.parse('save:fortitude');
const MODIFIER = 7;

const content = fixedContent(
  new ContentPackBuilder()
    .withId('player-core')
    .withAncestry('human', { hitPoints: HUMAN_HIT_POINTS })
    .withStatistic('fortitude', {
      name: 'Fortitude',
      selector: 'save:fortitude',
      domains: ['saving-throw'],
      base: `${MODIFIER}`,
      kind: StatisticKind.Check,
    })
    .withProficiencyBonus(PLAYER_CORE_PROFICIENCY_BONUS)
    .build(),
);

/** The total of a statistic that has a value. */
function totalOf(result: StatisticResult | undefined): number | undefined {
  return result?.ok === true ? result.total : undefined;
}

describe('turn cycle: the Fortitude a suffocation save rolls', () => {
  let kyra: Character;

  beforeEach(async () => {
    const repository = new InMemoryCharacterRepository();
    const characters = new CharacterService(repository, content, fixedClock('2026-10-26T10:00:00Z'));
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('is the total the sheet derives for the Fortitude save', async () => {
    const registry = await content.registry();
    const slots = slotContent(registry);
    const sources = { registry, slots, inputs: characterStatisticInputs(registry, kyra.document, slots), variants: [] };
    const sheet = characterStatistics(kyra.document, sources).get(SAVE);
    const limits = turnLimits(HitPoints.parse(10), NO_EFFECTS, NO_VALUED);

    const { fortitude } = turnCommandInputs(sources, kyra.document, limits);

    expect(totalOf(sheet)).toBe(MODIFIER);
    expect(Number(fortitude())).toBe(MODIFIER);
  });
});
