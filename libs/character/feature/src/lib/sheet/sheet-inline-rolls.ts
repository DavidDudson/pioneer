import { inject, Injectable } from '@angular/core';
import { resolveDamageNode } from '@pioneer/rules/engine';
import type { StatisticValue } from '@pioneer/rules/engine';
import { Dc } from '@pioneer/rules/sdk';
import type { CheckDc, Selector } from '@pioneer/rules/sdk';
import { INLINE_ROLLER } from '@pioneer/rules/ui';
import type { InlineCheckRoll, InlineDamageRoll, InlineRoller } from '@pioneer/rules/ui';

import { statisticInputsOf } from './sheet-inputs';
import { sheetRollSetup } from './sheet-roll-setup';
import { SheetRolls } from './sheet-rolls';
import { SheetState } from './sheet-state';

/**
 * Rolls the checks and damage that text on the sheet names (#341): a check is rolled like the sheet's own checks, from
 * the character's total for its statistic, against the DC the text gives; damage is rolled with the character's values
 * for what its formula reads. Both play on the roll stage and fill the roll card, through `SheetRolls`.
 */
@Injectable()
export class SheetInlineRolls implements InlineRoller {
  readonly #rolls = inject(SheetRolls);
  readonly #state = inject(SheetState);

  /** Whether the character has a value for `selector`, so a check in text for it can be rolled. */
  public hasStatistic(selector: Selector): boolean {
    return this.#statistic(selector) !== undefined;
  }

  /** Rolls a check in text against its DC: a number, or the total of another statistic (`against: class-dc`). */
  public check({ node, label }: InlineCheckRoll): void {
    const statistic = this.#statistic(node.statistic);
    if (statistic !== undefined) {
      this.#rolls.rollAgainst({ name: label, statistic }, this.#dcOf(node.dc), node);
    }
  }

  /** Rolls damage or healing in text. A formula the character has no value for (`@ancestry.hp`) rolls nothing. */
  public damage({ node, label }: InlineDamageRoll): void {
    const registry = this.#state.engine();
    const character = this.#state.character();
    if (registry === undefined || character === undefined) {
      return;
    }
    const resolved = resolveDamageNode(node, statisticInputsOf(registry, character));
    if (resolved.ok) {
      this.#rolls.rollDamage(label, resolved.expression);
    }
  }

  #statistic(selector: Selector): StatisticValue | undefined {
    const registry = this.#state.engine();
    const character = this.#state.character();
    return registry === undefined || character === undefined
      ? undefined
      : sheetRollSetup(registry, character, { selector, chosen: new Set(), as: undefined })?.statistic;
  }

  #dcOf(dc: CheckDc | undefined): Dc | undefined {
    if (typeof dc === 'number' || dc === undefined) {
      return dc;
    }
    const against = this.#statistic(dc.against);
    return against === undefined ? undefined : Dc.parse(Number(against.total));
  }
}

/** Provides the roller text on the sheet rolls through. */
export const SHEET_INLINE_ROLLS_PROVIDERS = [
  SheetInlineRolls,
  { provide: INLINE_ROLLER, useExisting: SheetInlineRolls },
];
