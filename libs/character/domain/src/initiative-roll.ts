import type { StatisticContent } from '@pioneer/rules/engine';
import { Domain, RollOption, Slug } from '@pioneer/rules/sdk';
import type { Selector } from '@pioneer/rules/sdk';

/** The domain of initiative checks: a modifier aimed at it reaches whichever statistic initiative is rolled with. */
export const INITIATIVE = Domain.parse('initiative');

/** The statistic a roll is made with, when it is made as something other than a plain check, and what that adds. */
export interface RollAs {
  /** The statistic rolled. */
  readonly statistic: Selector;
  /** The domain the roll belongs to besides the statistic's own. */
  readonly domain: Domain;
  /** The roll options the roll supplies, which predicates in the situational namespaces read. */
  readonly options: readonly RollOption[];
}

/** The last word of a selector: `stealth` for `skill:stealth`, `perception` for itself. */
function statisticName(selector: Selector): Slug {
  return Slug.parse(selector.slice(selector.lastIndexOf(':') + 1));
}

/**
 * Initiative rolled with `statistic` (#506), as Foundry's pf2e names it: a check of the initiative type, with the
 * statistic and the participant's initiative statistic as roll options ("+2 to initiative when rolling Stealth").
 */
export function initiativeRoll(statistic: Selector): RollAs {
  const name = statisticName(statistic);
  return {
    statistic,
    domain: INITIATIVE,
    options: [
      `check:type:initiative`,
      `check:statistic:initiative`,
      `check:statistic:${name}`,
      `self:participant:initiative:stat:${name}`,
    ].map((option) => RollOption.parse(option)),
  };
}

/** `content` with `as.domain` added to the domains of the statistic rolled, so modifiers aimed at it reach this roll. */
export function contentRolledAs(content: StatisticContent, as: RollAs | undefined): StatisticContent {
  if (as === undefined) {
    return content;
  }
  const definitions = content.definitions.map((definition) =>
    definition.selector === as.statistic && !definition.domains.includes(as.domain)
      ? { ...definition, domains: [...definition.domains, as.domain] }
      : definition,
  );
  return { ...content, definitions };
}
