import { inject, Injectable } from '@angular/core';
import type { Provider } from '@angular/core';
import { DiceExpressionText, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import type { DiceExpression, RollResult } from '@pioneer/rules/dice';
import { INLINE_ROLLER } from '@pioneer/rules/ui';
import type { InlineCheckRoll, InlineDamageRoll, InlineRoller } from '@pioneer/rules/ui';

import { RANDOM_SOURCE } from '../random-source';
import { presentRoll } from '../roll-stage/roll-presentation';
import { RollPresenter } from '../roll-stage/roll-presenter';

/** A check with no character behind it is one d20 and no modifier. */
const BARE_CHECK = DiceExpressionText.parse('1d20');

function bareCheck(): DiceExpression {
  const outcome = parseDiceExpression(BARE_CHECK);
  if (!outcome.ok) {
    throw new Error('The bare check expression does not parse');
  }
  return outcome.expression;
}

/**
 * Rolls the checks and damage in text read where no character is: a check is a bare d20, with no modifier and no
 * comparison with its DC, and damage is its dice. Both play on the roll stage, named by the words the text shows. A
 * formula that reads the character (`@attr.str`) rolls nothing.
 */
@Injectable()
export class BareInlineRoller implements InlineRoller {
  readonly #random = inject(RANDOM_SOURCE);
  readonly #presenter = inject(RollPresenter);
  #count = 0;

  /** No statistic is applied, so every check can be rolled. */
  // oxlint-disable-next-line eslint/class-methods-use-this -- the interface asks for a method; a roller with no character has no state to read
  public hasStatistic(): boolean {
    return true;
  }

  public check({ label }: InlineCheckRoll): void {
    this.#show(label, rollDice(bareCheck(), this.#random));
  }

  /** The engine loads with the first damage rolled: the roller is provided to the whole app, so it stays out of the initial bundle. */
  public async damage({ node, label }: InlineDamageRoll): Promise<void> {
    const { resolveDamageNode } = await import('@pioneer/rules/engine');
    const resolved = resolveDamageNode(node, undefined);
    if (resolved.ok) {
      this.#show(label, rollDice(resolved.expression, this.#random));
    }
  }

  #show(label: string, result: RollResult): void {
    this.#count += 1;
    this.#presenter.present(presentRoll(this.#count, label, result));
  }
}

/** Provides the roller for text read with no character, to the whole app; a character's sheet provides its own. */
export function provideBareInlineRoller(): Provider[] {
  return [BareInlineRoller, { provide: INLINE_ROLLER, useExisting: BareInlineRoller }];
}
