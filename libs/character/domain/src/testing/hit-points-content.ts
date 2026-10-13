import { HitPoints, StatisticKind } from '@pioneer/rules/sdk';
import type { ContentPack } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

/** The Hit Points a human gives in `hitPointsContent`, which is also the character's maximum there. */
export const HUMAN_HIT_POINTS: HitPoints = HitPoints.parse(8);

/**
 * A pack where a human (`humanAncestryId`) has a maximum of `HUMAN_HIT_POINTS`: `hp:max` reads only `@ancestry.hp`, so
 * no class is needed. For tests about play state.
 */
export function hitPointsContent(): ContentPack {
  return new ContentPackBuilder()
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
    .build();
}
