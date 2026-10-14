import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyState, List, ListItem, LocaleFormat, Skeleton, Text } from '@pioneer/frontier';
import type { Strike, StrikeDamage, StatisticResult } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { SIGNED, numberStyle } from '../breakdown/number-style';
import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import type { Chip } from '../picker-cells/chip-list/chip-list.component';
import { DAMAGE_TYPE_MESSAGES } from '../rich-text/rich-text-messages';
import { conditionalLines } from '../statistics/conditional-lines';
import { StatisticsMessage } from '../statistics/statistics-messages';
import { StrikeRow } from './strike-row.component';
import type { ShownAttack, ShownStrike } from './strike-row.component';
import { StrikesMessage } from './strikes-messages';

/** A Strike to list: what to call it, and what the engine derived for it. */
export interface NamedStrike {
  readonly name: string;
  /** A message key naming it instead, for one no content names (a fist's Strike). */
  readonly nameKey?: string | undefined;
  /** Its traits by name. */
  readonly traits: readonly string[];
  readonly strike: Strike;
}

/** A shield held beside the Strikes: its name and the numbers that matter when it blocks. */
export interface StrikesShield {
  readonly name: string;
  readonly hardness: number;
  readonly hitPoints: number;
  readonly brokenThreshold: number;
}

/** Rows of placeholders while the Strikes load. */
const LOADING_ROWS = 2;

/**
 * A character's Strikes (play-and-campaigns.md, "Statistics and breakdowns"): each one's name and attack modifier,
 * which expands in place to the attack roll's breakdown and the breakdown of the flat damage it adds, with its damage
 * roll and the multiple attack penalty its later attacks take beneath. A Strike whose attack the engine could not
 * derive is marked failed in text, with why.
 *
 * Read-only and presentational (ADR-0028): the caller passes the Strikes the engine derived (`deriveStrikes`) with
 * their names, or undefined while they load, and the display names of the entries their lines come from.
 *
 * ```html
 * <pio-strikes [strikes]="strikes()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-strikes',
  imports: [EmptyState, List, ListItem, Skeleton, StrikeRow, Text, TranslocoPipe],
  templateUrl: './strikes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrikesView {
  /** Undefined while loading: the list then shows placeholder rows. */
  public readonly strikes = input.required<readonly NamedStrike[] | undefined>();
  /** Display names of the entries the breakdown lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for what the breakdown lines' origin chains refer to beyond entries. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);
  /** The shields held, each listed with its Hardness, Hit Points and Broken Threshold. */
  public readonly shields = input<readonly StrikesShield[]>([]);

  protected readonly Statistics = StatisticsMessage;
  protected readonly loadingRows = [...Array.from({ length: LOADING_ROWS }).keys()];

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Ticks when the locale changes or a message scope finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly shown = computed((): readonly ShownStrike[] | undefined => {
    this.#messages();
    this.#format.locale();
    const words = {
      i18n: this.#i18n,
      format: this.#format,
      names: { entries: this.entryNames(), items: this.originNames().items },
    };
    return this.strikes()?.map(({ name, nameKey, traits, strike }): ShownStrike => {
      const bonus = strike.damage?.bonus;
      return {
        key: strike.weapon.slug,
        name: nameKey === undefined ? name : this.#i18n.translate(nameKey),
        traits: traits.map((label): Chip => ({ label })),
        attack: this.#attack(strike.attack),
        attacks: this.#attacks(strike),
        damage: this.#damage(strike),
        thrown: this.#thrown(strike),
        bonus: bonus?.ok === true ? bonus : undefined,
        attackConditions: strike.attack?.ok === true ? conditionalLines(strike.attack, words) : [],
        damageConditions: bonus?.ok === true ? conditionalLines(bonus, words) : [],
        penalty: this.#i18n.translate(StrikesMessage.MultipleAttackPenalty, {
          second: this.#format.number(strike.map.second, SIGNED),
          third: this.#format.number(strike.map.third, SIGNED),
        }),
      };
    });
  });

  /** "Attack +9 / +4 / -1": the attack modifier at each step of the multiple attack penalty; none without a total. */
  #attacks({ attack, map }: Strike): string | undefined {
    if (attack?.ok !== true) {
      return undefined;
    }
    const style = numberStyle(StatisticKind.Check);
    return this.#i18n.translate(StrikesMessage.Attacks, {
      first: this.#format.number(attack.total, style),
      second: this.#format.number(attack.total + map.second, style),
      third: this.#format.number(attack.total + map.third, style),
    });
  }

  /** "Steel Shield: Hardness 5, HP 20, Broken Threshold 10". */
  protected readonly shownShields = computed((): readonly string[] =>
    this.shields().map((shield) =>
      this.#i18n.translate(StrikesMessage.Shield, {
        name: shield.name,
        hardness: this.#format.number(shield.hardness),
        hitPoints: this.#format.number(shield.hitPoints),
        brokenThreshold: this.#format.number(shield.brokenThreshold),
      }),
    ),
  );

  #attack(result: StatisticResult | undefined): ShownAttack {
    if (result === undefined) {
      return { ok: false, error: this.#i18n.translate(StatisticsMessage.None) };
    }
    if (!result.ok) {
      return { ok: false, error: this.#i18n.translate(result.error.key, result.error.params) };
    }
    const style = numberStyle(StatisticKind.Check);
    const unpinned =
      result.pinnedBy === undefined
        ? undefined
        : this.#i18n.translate(StatisticsMessage.Computed, { computed: this.#format.number(result.computed, style) });
    return { ok: true, total: this.#format.number(result.total, style), computed: unpinned, statistic: result };
  }

  /** "1d6 persistent fire"; undefined without persistent damage. */
  #persistent(damage: StrikeDamage | undefined): string | undefined {
    const persistent = damage?.persistent;
    if (persistent === undefined) {
      return undefined;
    }
    const type = this.#i18n.translate(DAMAGE_TYPE_MESSAGES[persistent.damageType]);
    return this.#i18n.translate(StrikesMessage.Persistent, { formula: persistent.formula, type });
  }

  /** "1 fire splash"; undefined without splash damage. */
  #splash(damage: StrikeDamage | undefined): string | undefined {
    if (damage?.splash === undefined) {
      return undefined;
    }
    const type = this.#i18n.translate(DAMAGE_TYPE_MESSAGES[damage.damageType]);
    return this.#i18n.translate(StrikesMessage.Splash, { amount: this.#format.number(damage.splash), type });
  }

  /** What a bomb or thrown consumable adds to its Strike: range increment, persistent and splash damage, stack size. */
  #thrown({ weapon, damage }: Strike): readonly string[] {
    const { range, quantity } = weapon;
    const lines = [
      range === undefined
        ? undefined
        : this.#i18n.translate(StrikesMessage.RangeIncrement, { range: this.#format.number(range) }),
      this.#persistent(damage),
      this.#splash(damage),
      quantity === undefined
        ? undefined
        : this.#i18n.translate(StrikesMessage.Quantity, { count: this.#format.number(quantity) }),
    ];
    return lines.filter((line): line is string => line !== undefined);
  }

  /** "1d8+4 slashing": the dice, then the flat bonus unless it is nothing or did not derive, then the type. */
  #damage({ damage }: Strike): string {
    if (damage === undefined) {
      return this.#i18n.translate(StrikesMessage.NoDamage);
    }
    const dice = damage.die === undefined ? `${damage.dice}` : `${damage.dice}${damage.die}`;
    const flat = damage.bonus?.ok === true && damage.bonus.total !== 0 ? damage.bonus.total : undefined;
    const bonus = flat === undefined ? '' : this.#format.number(flat, SIGNED);
    const type = this.#i18n.translate(DAMAGE_TYPE_MESSAGES[damage.damageType]);
    return this.#i18n.translate(StrikesMessage.Damage, { roll: `${dice}${bonus}`, type });
  }
}
