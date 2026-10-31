import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { initiativeRoll, PlayCommandField } from '@pioneer/character/domain';
import type { RollAs, RollSetup } from '@pioneer/character/domain';
import { LocaleFormat } from '@pioneer/frontier';
import { RANDOM_SOURCE, rollView } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import {
  checkOutcome,
  degreeOfSuccess,
  DiceExpressionText,
  NO_FORTUNE,
  parseDiceExpression,
  rollWithFortune,
  Sign,
} from '@pioneer/rules/dice';
import type { DiceExpression, FortunedRoll } from '@pioneer/rules/dice';
import type { RuleId, StatisticValue } from '@pioneer/rules/engine';
import type { ToggleSlot } from '@pioneer/rules/grants';
import type { Dc, Selector } from '@pioneer/rules/sdk';
import { conditionalLineText, STATISTIC_ROLLER } from '@pioneer/rules/ui';
import type { ConditionWords, RollableStatistic, StatisticRoller } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { PlayStore } from '../data/play-store';
import { describeSaveError } from './sheet-field';
import { sheetRollSetup } from './sheet-roll-setup';
import { SheetState } from './sheet-state';

/** The check as last rolled: what it was, the dice that fell, the toggles it was rolled with, worded. */
interface RolledCheck {
  readonly id: number;
  readonly name: string;
  readonly statistic: StatisticValue;
  readonly expression: DiceExpression;
  readonly roll: FortunedRoll;
  readonly reasons: readonly string[];
}

/** The last check rolled from the sheet, as the roll card shows it. */
export interface LastRoll {
  readonly name: string;
  readonly statistic: StatisticValue;
  readonly view: RollView;
}

/** A check being set up: what it is, and the situations the roll has claimed so far. */
interface PendingCheck {
  readonly name: string;
  readonly selector: Selector;
  readonly chosen: ReadonlySet<RuleId>;
  readonly as?: RollAs | undefined;
}

/** A check being set up, with what rolling it offers and how those choices change it. */
export interface CheckSetup extends RollSetup {
  readonly name: string;
  readonly selector: Selector;
  readonly chosen: ReadonlySet<RuleId>;
  readonly as?: RollAs | undefined;
}

/** `1d20+7`, `1d20-1`, or a bare `1d20` for a +0 check: the statistic's total added to one d20. */
function checkText(total: number): DiceExpressionText {
  const sign = total < 0 ? Sign.Minus : Sign.Plus;
  return DiceExpressionText.parse(total === 0 ? '1d20' : `1d20${sign}${Math.abs(total)}`);
}

/**
 * Rolls checks for the sheet (#339, #340): a statistic's total from the engine's breakdown, added to one d20 and rolled
 * with the browser's random source. A check rolls at once with the situations claimed for it on the sheet (#537) and the
 * `RollOption` toggles as they stand; `setUp` instead holds it in `setup` for the player to review, and the total
 * follows what they pick. Keeps the last
 * roll, with the toggles it was made with, for the card in the header. Provided per sheet, and standing in for the
 * `STATISTIC_ROLLER` the statistics rows look for. Fortune and misfortune come with #341.
 */
@Injectable()
export class SheetRolls implements StatisticRoller {
  readonly #random = inject(RANDOM_SOURCE);
  readonly #state = inject(SheetState);
  readonly #play = inject(PlayStore);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #rolled = signal<RolledCheck | undefined>(undefined);
  readonly #pending = signal<PendingCheck | undefined>(undefined);
  #count = 0;

  /** The DC the last roll is compared with; unset until one is typed. A new roll keeps it. */
  public readonly dc = signal<Dc | undefined>(undefined);

  /** Why the last toggle was not saved; unset while it was. */
  public readonly saveError = signal<MessageDescriptor | undefined>(undefined);

  /** The last roll with its degree against the DC, when one is set. */
  public readonly last = computed((): LastRoll | undefined => {
    const rolled = this.#rolled();
    if (rolled === undefined) {
      return undefined;
    }
    const dc = this.dc();
    const kept = rolled.roll.rolls.find((entry) => entry.kept);
    const degree = dc === undefined || kept === undefined ? undefined : degreeOfSuccess(checkOutcome(kept.result), dc);
    const { id, name, statistic, expression, roll, reasons } = rolled;
    return { name, statistic, view: rollView(id, { expression, roll, degree, damage: undefined, reasons }) };
  });

  /**
   * The check being set up, with its statistic as the choices so far leave it; unset when none is, or while the
   * content loads.
   */
  public readonly setup = computed((): CheckSetup | undefined => {
    const pending = this.#pending();
    const registry = this.#state.engine();
    const character = this.#state.character();
    if (pending === undefined || registry === undefined || character === undefined) {
      return undefined;
    }
    const offered = sheetRollSetup(registry, character, pending);
    return offered === undefined
      ? undefined
      : { ...offered, name: pending.name, selector: pending.selector, chosen: pending.chosen, as: pending.as };
  });

  /**
   * Rolls the check at once with the situations claimed for it on the sheet and the `RollOption` toggles as they
   * stand, then lets the claims go: they last for one roll.
   */
  public roll({ name, statistic }: RollableStatistic): void {
    const { selector } = statistic;
    const chosen = this.#state.claims().get(selector) ?? new Set<RuleId>();
    const offered = this.#offered(selector, chosen);
    this.saveError.set(undefined);
    this.#state.release(selector);
    if (offered === undefined) {
      this.#finish(name, statistic, []);
      return;
    }
    this.#finish(name, offered.statistic, this.#reasons({ ...offered, name, selector, chosen }));
  }

  /** Sets the check up for the player to review: the situations claimed so far are chosen, and more can be. */
  public setUp({ name, statistic }: RollableStatistic): void {
    const { selector } = statistic;
    this.saveError.set(undefined);
    this.#pending.set({ name, selector, chosen: new Set(this.#state.claims().get(selector)) });
  }

  /**
   * Rolls initiative with `selector` at once (#506): the statistic derived as an initiative check, so the modifiers
   * aimed at initiative and the options an initiative roll supplies count, with the situations claimed for the
   * statistic. The roll is kept nowhere but the last roll; nothing about initiative is play state.
   */
  public rollInitiative(name: string, selector: Selector): void {
    const as = initiativeRoll(selector);
    const chosen = this.#state.claims().get(selector) ?? new Set<RuleId>();
    const offered = this.#offered(selector, chosen, as);
    this.saveError.set(undefined);
    this.#state.release(selector);
    if (offered !== undefined) {
      this.#finish(name, offered.statistic, this.#reasons({ ...offered, name, selector, chosen, as }));
    }
  }

  /** Claims the situation of a conditional line for the next roll of `selector`, or lets it go. */
  public claim(selector: Selector, rule: RuleId, on: boolean): void {
    this.#state.claim(selector, rule, on);
  }

  /** Counts a situation for the check being set up, or stops counting it. */
  public choose(line: RuleId, on: boolean): void {
    this.#pending.update((pending) => {
      if (pending === undefined) {
        return pending;
      }
      const chosen = new Set(pending.chosen);
      if (on) {
        chosen.add(line);
      } else {
        chosen.delete(line);
      }
      return { ...pending, chosen };
    });
  }

  /** Sets a `RollOption` toggle on the character, who keeps it from roll to roll. */
  public async toggle(slot: ToggleSlot, on: boolean): Promise<void> {
    this.saveError.set(undefined);
    const state = slot.suboption === undefined ? { on } : { on, suboption: slot.suboption };
    try {
      await this.#play.send({ field: PlayCommandField.SetToggle, toggle: slot.key, state });
    } catch (error: unknown) {
      this.saveError.set(describeSaveError(error));
    }
  }

  /** Rolls the check being set up with the choices made, and keeps them with the result. */
  public rollSetUp(): void {
    const setup = this.setup();
    if (setup === undefined) {
      return;
    }
    this.#pending.set(undefined);
    this.#state.release(setup.selector);
    this.#finish(setup.name, setup.statistic, this.#reasons(setup));
  }

  /** Drops the check being set up without rolling it. */
  public cancel(): void {
    this.#pending.set(undefined);
  }

  /** What rolling `selector` offers with `chosen` claimed; undefined while the content loads or it has no value. */
  #offered(selector: Selector, chosen: ReadonlySet<RuleId>, as?: RollAs): RollSetup | undefined {
    const registry = this.#state.engine();
    const character = this.#state.character();
    return registry === undefined || character === undefined
      ? undefined
      : sheetRollSetup(registry, character, { selector, chosen, as });
  }

  /** The toggles `setup` is rolled with, worded: the situations claimed, then the `RollOption` toggles that are on. */
  #reasons({ conditional, toggles, chosen }: CheckSetup): readonly string[] {
    const words = this.#words();
    const claimed = conditional.filter(({ modifier }) => chosen.has(modifier.id));
    const kept = toggles.filter(({ on }) => on);
    return [
      ...claimed.map((line) => conditionalLineText(line, words)),
      ...kept.map(({ origin }) => words.names.entries.get(origin.entry) ?? origin.entry),
    ];
  }

  #words(): ConditionWords {
    return { i18n: this.#i18n, format: this.#format, names: { entries: this.#state.picks.entryNames() } };
  }

  #finish(name: string, statistic: StatisticValue, reasons: readonly string[]): void {
    const outcome = parseDiceExpression(checkText(statistic.total));
    if (!outcome.ok) {
      return;
    }
    this.#count += 1;
    const roll = rollWithFortune(outcome.expression, NO_FORTUNE, this.#random);
    this.#rolled.set({ id: this.#count, name, statistic, expression: outcome.expression, roll, reasons });
  }
}

/** Provides the sheet's rolls under both names: the service the header reads, and the roller statistics look for. */
export const SHEET_ROLLS_PROVIDERS = [SheetRolls, { provide: STATISTIC_ROLLER, useExisting: SheetRolls }];
