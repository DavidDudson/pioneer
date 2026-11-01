import type { RuleId, Strike } from '@pioneer/rules/engine';
import type { ContentId } from '@pioneer/rules/sdk';

import type { UsableLine } from '../actions/action-user';
import type { StatisticSituations } from '../statistics/statistics.component';

/** A rule element that would change a Strike's damage if a roll claimed its situation, with the entry it comes from. */
export interface StrikeOffer {
  readonly id: RuleId;
  readonly entry: ContentId;
}

/** The situations a Strike's damage can claim: those offered, and those claimed for its next roll. */
export interface StrikeSituations {
  readonly offered: readonly StrikeOffer[];
  readonly claimed: ReadonlySet<RuleId>;
}

/** A Strike to list: what to call it, and what the engine derived for it. */
export interface NamedStrike {
  readonly name: string;
  /** A message key naming it instead, for one no content names (a fist's Strike). */
  readonly nameKey?: string | undefined;
  /** Its traits by name. */
  readonly traits: readonly string[];
  readonly strike: Strike;
  /** The situations a roll of its attack can claim, when the page lets the player claim them. */
  readonly situations?: StatisticSituations | undefined;
  /** The situations a roll of its damage can claim (the target is undead), when the page lets the player claim them. */
  readonly damageSituations?: StrikeSituations | undefined;
  /** What using the Strike spends, when the page lets it be used: its weapon, one action, and what the turn can pay. */
  readonly use?: UsableLine | undefined;
}

/** A shield held beside the Strikes: its name and the numbers that matter when it blocks; a form's has no Hit Points. */
export interface StrikesShield {
  readonly name: string;
  readonly hardness: number;
  readonly hitPoints: number;
  readonly brokenThreshold: number;
  readonly undamageable?: boolean;
}
