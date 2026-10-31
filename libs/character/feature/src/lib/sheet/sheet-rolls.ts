import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { initiativeRoll, PlayCommandField } from '@pioneer/character/domain';
import type { RollAs, RollSetup } from '@pioneer/character/domain';
import { LocaleFormat } from '@pioneer/frontier';
import { keptRoll, presentRoll, RANDOM_SOURCE, RollPresenter, rollView, withDegree, withSave } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import { DiceExpressionText, NO_FORTUNE, parseDiceExpression, rollWithFortune, Sign } from '@pioneer/rules/dice';
import type { DiceExpression, FortunedRoll } from '@pioneer/rules/dice';
import type { RuleId, StatisticValue } from '@pioneer/rules/engine';
import type { ToggleSlot } from '@pioneer/rules/grants';
import type { CheckNode, Dc, DegreeOfSuccess, Selector } from '@pioneer/rules/sdk';
import { conditionalLineText, STATISTIC_ROLLER } from '@pioneer/rules/ui';
import type { ConditionWords, RollableStatistic, StatisticRoller } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { PlayStore } from '../data/play-store';
import { basicSaveDegree, savedDamage } from './sheet-basic-save';
import { describeSaveError } from './sheet-field';
import { rolledDegree } from './sheet-roll-degree';
import { sheetRollSetup } from './sheet-roll-setup';
import type { Against, CheckRoll, PendingCheck, RolledCheck } from './sheet-roll-types';
import { SheetState } from './sheet-state';

/** The last check rolled from the sheet, as the roll card shows it. */
export interface LastRoll {
  readonly name: string;
  readonly statistic: StatisticValue | undefined;
  readonly view: RollView;
}

/** A check being set up: what it is, and the situations the roll has claimed so far. */
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
  readonly #presenter = inject(RollPresenter);
  readonly #state = inject(SheetState);
  readonly #play = inject(PlayStore);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #rolled = signal<RolledCheck | undefined>(undefined);
  readonly #pending = signal<PendingCheck | undefined>(undefined);
  #count = 0;
  /** The degree of the last basic save rolled; the next damage rolled follows it, then it is let go. */
  #save: DegreeOfSuccess | undefined;

  /** The DC the last roll is compared with; unset until one is typed. A new roll keeps it. */
  public readonly dc = signal<Dc | undefined>(undefined);

  /** Why the last toggle was not saved; unset while it was. */
  public readonly saveError = signal<MessageDescriptor | undefined>(undefined);

  /** The DC the card compares the last roll with: the one its check in text asked for, else the typed one. */
  public readonly cardDc = computed((): Dc | undefined => this.#rolled()?.dc ?? this.dc());

  /** The last roll with its degree against the DC, when one is set. */
  public readonly last = computed((): LastRoll | undefined => {
    const rolled = this.#rolled();
    if (rolled === undefined) {
      return undefined;
    }
    const dc = this.cardDc();
    const degree = rolled.statistic === undefined ? undefined : rolledDegree(rolled.roll, dc);
    const { id, name, statistic, expression, roll, reasons, check, damage } = rolled;
    return { name, statistic, view: rollView(id, { expression, roll, degree, damage, reasons, check }) };
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
  public roll(rollable: RollableStatistic): void {
    this.rollAgainst(rollable, undefined);
  }

  /** Rolls the check like `roll`; the card compares it to `dc` (a check in text gives its own) until one is typed. */
  public rollAgainst({ name, statistic }: RollableStatistic, dc: Dc | undefined, check?: CheckNode): void {
    const { selector } = statistic;
    const chosen = this.#state.claims().get(selector) ?? new Set<RuleId>();
    const offered = this.#offered(selector, chosen);
    this.saveError.set(undefined);
    this.#state.release(selector);
    if (offered === undefined) {
      this.#finish({ name, statistic, reasons: [], dc, check });
      return;
    }
    const reasons = this.#reasons({ ...offered, name, selector, chosen });
    this.#finish({ name, statistic: offered.statistic, reasons, dc, check });
  }

  /**
   * Rolls damage or healing named in text: no statistic and no DC. Right after a basic save the damage follows its
   * degree (none, half rounded down, full, double); the save is let go either way, so it never scales a later roll.
   */
  public rollDamage(name: string, expression: DiceExpression): void {
    this.saveError.set(undefined);
    this.#count += 1;
    const save = this.#save;
    this.#save = undefined;
    const roll = rollWithFortune(expression, NO_FORTUNE, this.#random);
    const damage = savedDamage(roll, save);
    this.#rolled.set({
      id: this.#count,
      name,
      statistic: undefined,
      expression,
      roll,
      reasons: [],
      dc: undefined,
      damage,
    });
    this.#present(name, roll, { dc: undefined, damage });
  }

  /** Types the DC the card compares the last roll with; it replaces the one a check in text asked for. */
  public typeDc(dc: Dc | undefined): void {
    this.dc.set(dc);
    this.#rolled.update((rolled) => (rolled === undefined ? rolled : { ...rolled, dc: undefined }));
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
      const reasons = this.#reasons({ ...offered, name, selector, chosen, as });
      this.#finish({ name, statistic: offered.statistic, reasons, dc: undefined });
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
    this.#finish({ name: setup.name, statistic: setup.statistic, reasons: this.#reasons(setup), dc: undefined });
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
  #finish({ name, statistic, reasons, dc, check }: CheckRoll): void {
    const outcome = parseDiceExpression(checkText(statistic.total));
    if (!outcome.ok) {
      return;
    }
    this.#count += 1;
    const roll = rollWithFortune(outcome.expression, NO_FORTUNE, this.#random);
    this.#rolled.set({ id: this.#count, name, statistic, expression: outcome.expression, roll, reasons, dc, check });
    const cardDc = this.cardDc();
    // A new check drops the save before it; only a basic save with a degree links the damage rolled next.
    this.#save = basicSaveDegree(roll, cardDc, check);
    this.#present(name, roll, { dc: cardDc, check });
  }

  /**
   * Shows the roll on the stage; a check also names its degree and what it does (`against` is what it was rolled for),
   * and damage a basic save scaled shows what was taken beside what the dice came to.
   */
  #present(name: string, roll: FortunedRoll, against: Against): void {
    const counted = keptRoll(roll);
    if (counted === undefined) {
      return;
    }
    const rolled = presentRoll(this.#count, name, counted);
    const shown = against.damage === undefined ? rolled : withSave(rolled, against.damage);
    const degree = rolledDegree(roll, against.dc);
    this.#presenter.present(degree === undefined ? shown : withDegree(shown, degree.degree, against.check));
  }
}

/** Provides the sheet's rolls under both names: the service the header reads, and the roller statistics look for. */
export const SHEET_ROLLS_PROVIDERS = [SheetRolls, { provide: STATISTIC_ROLLER, useExisting: SheetRolls }];
