import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Disclosure, Stack, Text } from '@pioneer/frontier';
import { RuleId } from '@pioneer/rules/engine';
import type { StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import type { UsableLine } from '../actions/action-user';
import { UseButtons } from '../actions/use-buttons.component';
import { BreakdownView } from '../breakdown/breakdown.component';
import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { ChipList } from '../picker-cells/chip-list/chip-list.component';
import { StatisticConditions } from '../statistics/statistic-conditions/statistic-conditions.component';
import type {
  ConditionChange,
  ConditionToggle,
} from '../statistics/statistic-conditions/statistic-conditions.component';
import { StatisticRoll } from '../statistics/statistic-roll/statistic-roll.component';
import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import { StatisticTotal } from '../statistics/statistic-total/statistic-total.component';
import { StatisticsMessage } from '../statistics/statistics-messages';
import { StrikeNotes } from './strike-notes.component';
import type { ShownNote } from './strike-notes.component';
import { StrikesMessage } from './strikes-messages';

/** A Strike's attack roll as shown: its total and breakdown, or why it has none. */
export type ShownAttack =
  | {
      readonly ok: true;
      readonly total: string;
      /** "computed 18" when a set override pinned the total; undefined otherwise. */
      readonly computed: string | undefined;
      readonly statistic: StatisticValue;
    }
  | { readonly ok: false; readonly error: string };

/** An attack the engine derived. */
export type DerivedAttack = Extract<ShownAttack, { readonly ok: true }>;

/** One Strike as shown. */
export interface ShownStrike {
  readonly key: string;
  readonly name: string;
  /** What the Use button spends, when the page can spend. */
  readonly use: UsableLine | undefined;
  readonly attack: ShownAttack;
  /** Its traits by name. */
  readonly traits: readonly Chip[];
  /** "Attack +9 / +4 / -1": the attack at each step of the multiple attack penalty; undefined when it has none. */
  readonly attacks: string | undefined;
  /** "+2 circumstance when your shield is raised (Steel Shield)": the attack's lines that apply only in some situations. */
  readonly attackConditions: readonly string[];
  /** The attack's lines whose situation can be claimed for its next roll, as toggles. */
  readonly attackToggles: readonly ConditionToggle[];
  /** The same for the flat damage bonus. */
  readonly damageConditions: readonly string[];
  /** "1d8+4 slashing"; the none message for a weapon that rolls no damage. */
  readonly damage: string;
  /** "Plus 1d6 fire precision": the dice rule elements add to the damage, each as a line. */
  readonly extras: readonly string[];
  /** The notes on the attack roll. */
  readonly attackNotes: readonly ShownNote[];
  /** The notes on the damage roll. */
  readonly damageNotes: readonly ShownNote[];
  /** The flat damage statistic's breakdown, when it derived. */
  readonly bonus: StatisticValue | undefined;
  /** "Range increment 20 ft", "1d6 persistent fire", "1 fire splash", "3 in stack": what a thrown Strike adds. */
  readonly thrown: readonly string[];
  /** "Multiple attack penalty -5 / -10". */
  readonly penalty: string;
}

/**
 * One Strike of the list (`pio-strikes`): its name and attack modifier, which expands in place to the attack roll's
 * breakdown and the damage bonus's, with its damage roll and multiple attack penalty beneath. An attack the engine
 * could not derive is marked failed in text, with why. Presentational (ADR-0028): the list formats everything.
 */
@Component({
  selector: 'pio-strike-row',
  imports: [
    Badge,
    BreakdownView,
    ChipList,
    Disclosure,
    StrikeNotes,
    Stack,
    StatisticConditions,
    StatisticRoll,
    StatisticTotal,
    Text,
    TranslocoPipe,
    UseButtons,
  ],
  templateUrl: './strike-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrikeRow {
  public readonly row = input.required<ShownStrike>();
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  readonly #roller = inject(STATISTIC_ROLLER, { optional: true });

  protected readonly Message = StrikesMessage;
  protected readonly Statistics = StatisticsMessage;
  protected readonly attackKind = StatisticKind.Check;
  protected readonly bonusKind = StatisticKind.Value;

  /** The attack when the engine derived it. */
  /** The lines under the damage: its extra lines, then those of the thrown attack. */
  protected readonly lines = computed((): readonly string[] => [...this.row().extras, ...this.row().thrown]);

  protected readonly derived = computed((): DerivedAttack | undefined => {
    const { attack } = this.row();
    return attack.ok ? attack : undefined;
  });

  /** Claims the situation of an attack line for the Strike's next roll, or lets it go. */
  protected claim({ id, on }: ConditionChange): void {
    const attack = this.derived();
    if (attack !== undefined) {
      this.#roller?.claim?.(attack.statistic.selector, RuleId.parse(id), on);
    }
  }

  /** Why it has no attack, when it has none. */
  protected readonly failure = computed((): string | undefined => {
    const { attack } = this.row();
    return attack.ok ? undefined : attack.error;
  });
}
