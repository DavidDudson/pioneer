import type { RollAs } from '@pioneer/character/domain';
import type { DamageApplication, DiceExpression, FortunedRoll } from '@pioneer/rules/dice';
import type { RuleId, StatisticValue } from '@pioneer/rules/engine';
import type { CheckNode, Dc, Selector } from '@pioneer/rules/sdk';

/** The check as last rolled: what it was, the dice that fell, the toggles it was rolled with, worded. */
export interface RolledCheck {
  readonly id: number;
  readonly name: string;
  /** The statistic a check was rolled for; unset for damage, which has none. */
  readonly statistic: StatisticValue | undefined;
  /** The check in text that was rolled, for the outcomes it spells out; unset for any other roll. */
  readonly check?: CheckNode | undefined;
  readonly expression: DiceExpression;
  readonly roll: FortunedRoll;
  readonly reasons: readonly string[];
  /** The DC a check in text asked for; it stands in for the typed one until a DC is typed. */
  readonly dc: Dc | undefined;
  /** The damage a basic save scaled, when this is damage rolled after one; unset for any other roll. */
  readonly damage?: DamageApplication | undefined;
}

/** A check rolled: what it is, the toggles it is rolled with, worded, and the DC its text asked for. */
export interface CheckRoll {
  readonly name: string;
  readonly statistic: StatisticValue;
  readonly reasons: readonly string[];
  readonly dc: Dc | undefined;
  readonly check?: CheckNode | undefined;
}

/** What a roll on the stage is compared with, the check in text behind it, and the damage a basic save scaled. */
export interface Against {
  readonly dc: Dc | undefined;
  readonly check?: CheckNode | undefined;
  readonly damage?: DamageApplication | undefined;
}

/** A check being set up: what it is, and the situations the roll has claimed so far. */
export interface PendingCheck {
  readonly name: string;
  readonly selector: Selector;
  readonly chosen: ReadonlySet<RuleId>;
  readonly as?: RollAs | undefined;
}
