import {
  checkOutcome,
  degreeOfSuccess,
  DiceExpressionText,
  DieFace,
  NO_FORTUNE,
  parseDiceExpression,
  rollWithFortune,
} from '@pioneer/rules/dice';
import type { DegreeAdjustment, DiceExpression, FortuneSources } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { Dc, DegreeChange, DegreeOfSuccess, InlineKind, RichTextString, Selector } from '@pioneer/rules/sdk';
import type { CheckNode } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { rollView } from '../roll-view';
import type { RollView } from '../roll-view';

const MIDDLING = 12;
const HIGH = 14;
const LOW = 5;
const MISSING = 4;
const NATURAL_TWENTY = 20;
const EASY_DC = 15;
const HARD_DC = 25;

/* Rolls the card specs and stories show: scripted dice, so each variant reads the same every run. */

const FORTUNE: FortuneSources = { fortune: [message('roll.fixture.fortune')], misfortune: [] };
const MISFORTUNE: FortuneSources = { fortune: [], misfortune: [message('roll.fixture.misfortune')] };
const BOTH: FortuneSources = { fortune: FORTUNE.fortune, misfortune: MISFORTUNE.misfortune };

/** What a rolled check is compared with. */
interface Against {
  readonly dc: number;
  readonly adjustments?: readonly DegreeAdjustment[];
  /** The check in text that was rolled, when it was. */
  readonly inText?: CheckNode;
}

function expressionOf(text: string): DiceExpression {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (!outcome.ok) {
    throw new Error(outcome.error.key);
  }
  return outcome.expression;
}

/** `1d20+7` rolled with `faces` falling in order, against a DC when one is given. */
function check(faces: readonly number[], sources: FortuneSources = NO_FORTUNE, against?: Against): RollView {
  const expression = expressionOf('1d20+7');
  const roll = rollWithFortune(expression, sources, scriptedRandom(faces.map((face) => DieFace.parse(face))));
  const kept = roll.rolls.find((entry) => entry.kept);
  const degree =
    against === undefined || kept === undefined
      ? undefined
      : degreeOfSuccess(checkOutcome(kept.result), Dc.parse(against.dc), against.adjustments);
  return rollView(1, { expression, roll, degree, damage: undefined, check: against?.inText });
}

/** A d20 of 12 and +7: 19. */
export const PLAIN_CHECK = check([MIDDLING]);
/** The same against DC 15: a success. */
export const SUCCESS = check([MIDDLING], NO_FORTUNE, { dc: EASY_DC });
export const CRITICAL_SUCCESS = check([NATURAL_TWENTY], NO_FORTUNE, { dc: EASY_DC });
export const FAILURE = check([MISSING], NO_FORTUNE, { dc: EASY_DC });
export const CRITICAL_FAILURE = check([1], NO_FORTUNE, { dc: HARD_DC });
/** Two d20s, 5 and 14; the 14 is kept. */
export const FORTUNE_CHECK = check([LOW, HIGH], FORTUNE);
/** Two d20s, 14 and 5; the 5 is kept. */
export const MISFORTUNE_CHECK = check([HIGH, LOW], MISFORTUNE);
/** Fortune and misfortune cancel: one d20. */
export const CANCELLED_CHECK = check([MIDDLING], BOTH);

/** The reasons a check is rolled with: a situation chosen for this roll, and a toggle the character keeps. */
export const TOGGLE_REASONS = ["+1 circumstance when the target is undead (Hunter's cloak)", "Hunter's focus"];
/** A d20 of 12 and +7 rolled with two toggles on. */
export const WITH_TOGGLES: RollView = { ...PLAIN_CHECK, reasons: TOGGLE_REASONS };

/** A success that an effect raises to a critical success. */
export const ADJUSTED_DEGREE = check([MIDDLING], NO_FORTUNE, {
  dc: EASY_DC,
  adjustments: [
    {
      appliesTo: DegreeOfSuccess.Success,
      change: DegreeChange.OneDegreeBetter,
      reason: message('roll.fixture.juggernaut'),
    },
  ],
});

const CHECK_DC = Dc.parse(EASY_DC);
const WILL = Selector.parse('save:will');
const REFLEX = Selector.parse('save:reflex');

/** The failure words of a Will save in text. */
const FLEE = [{ type: InlineKind.Text, text: RichTextString.parse('You flee for 1 round.') }] as const;

/** A save in text rolled against DC 15, with the words it gives. */
function saveInText(statistic: Selector, rest: Partial<CheckNode>): Against {
  return { dc: EASY_DC, inText: { type: InlineKind.Check, statistic, dc: CHECK_DC, ...rest } };
}

/** A Will save in text that spells out its failure: rolled and missed. */
export const WORDED_FAILURE = check([MISSING], NO_FORTUNE, saveInText(WILL, { outcomes: { failure: FLEE } }));
/** The same save in text with no words for the degree rolled. */
export const UNWORDED_SUCCESS = check([MIDDLING], NO_FORTUNE, saveInText(WILL, { outcomes: { failure: FLEE } }));
/** A basic Reflex save in text, missed: the rule's fixed result. */
export const BASIC_SAVE_FAILURE = check([MISSING], NO_FORTUNE, saveInText(REFLEX, { basic: true }));
