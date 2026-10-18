import type { FormulaValue, ResolveReference } from '@pioneer/rules/formula';
import { Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { FormMovement, ModifierType, RollOption, RuleElementKey, RuleNumber } from '@pioneer/rules/sdk';
import type { BattleFormElement, Origin, RuleValue, Selector } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { CHECK_PENALTY } from './armor-bonus';
import { LabelParam, LineStatusKind, SuppressionReason } from './breakdown';
import type { BreakdownLine, ModifierLabel } from './breakdown';
import { EngineMessage } from './messages';
import { labelOf } from './modifier';
import { ruleIdOf } from './rule-in-play';
import type { ModifierInputs, RuleId } from './rule-in-play';
import { truthOf, valueOf, whole } from './rule-value';
import { failure, FormSource, totalOutOfRange } from './statistic-result';
import type { FormReplacement, StatisticResult, StatisticValue } from './statistic-result';

/** A battle form that holds: the rule element, and what it sets while it lasts. */
export interface FormInPlay {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  readonly form: BattleFormElement['form'];
}

const SKILL_PREFIX = 'skill:';
const SPEED_PREFIX = 'speed:';
const AC = 'ac';

/** Where the character's traits are written: `self:trait:humanoid`. */
const TRAIT_PREFIX = 'self:trait:';

/** A speed the form does not list is one the character no longer has. */
const NO_SPEED = RuleNumber.parse(0);

/**
 * The battle form in force: a `BattleForm` element whose predicate holds, and, since a character can be in one form
 * at a time, the one with the smallest rule id when several do. One that depends on the situation gives nothing.
 * Only the form's base is read here; its brackets (heightened forms) join when the form's spell rank is known.
 */
export function battleFormInPlay({ rules, facts }: ModifierInputs): FormInPlay | undefined {
  const forms: FormInPlay[] = [];
  for (const rule of rules) {
    const { element } = rule;
    if (element.key === RuleElementKey.BattleForm && truthOf(element.predicate, facts) === Truth.True) {
      forms.push({ id: ruleIdOf(rule), label: labelOf(rule), origin: rule.origin, form: element.form });
    }
  }
  return forms.toSorted((left, right) => Number(left.id > right.id) - Number(left.id < right.id))[0];
}

/** What a form sets one statistic to, and whether the character's own stands when it is higher. */
interface Replacement {
  readonly value: RuleValue;
  readonly ownIfHigher: boolean;
  /** Whether the armour's check penalty stays on the statistic: it does unless the form ignores it. */
  readonly checkPenalty: boolean;
}

function movementOf(selector: Selector): FormMovement | undefined {
  return Object.values(FormMovement).find((movement) => `${SPEED_PREFIX}${movement}` === selector);
}

/** What `form` replaces `selector` with: Armor Class, a skill it lists, or a speed when it lists speeds. */
function replacementOf({ form }: FormInPlay, selector: Selector): Replacement | undefined {
  const checkPenalty = form.armorClass?.ignoreCheckPenalty !== true;
  if (selector === AC) {
    return form.armorClass === undefined
      ? undefined
      : { value: form.armorClass.modifier, ownIfHigher: true, checkPenalty };
  }
  if (selector.startsWith(SKILL_PREFIX)) {
    const skill = form.skills?.find((each) => each.skill === selector);
    return skill === undefined
      ? undefined
      : { value: skill.modifier, ownIfHigher: skill.ownIfHigher !== false, checkPenalty };
  }
  const movement = movementOf(selector);
  if (movement === undefined || form.speeds === undefined) {
    return undefined;
  }
  return { value: RuleNumber.parse(form.speeds[movement] ?? NO_SPEED), ownIfHigher: false, checkPenalty };
}

/**
 * Whether the form takes a line off the statistic: item bonuses go (armour's among them, and a rune's), and so does
 * armour's check penalty when the form ignores it. Status and circumstance bonuses and penalties, and the rest,
 * still apply.
 */
function removedByForm({ modifier, status, value }: BreakdownLine, { checkPenalty }: Replacement): boolean {
  if (status.kind !== LineStatusKind.Applied) {
    return false;
  }
  if (modifier.slug === CHECK_PENALTY) {
    return !checkPenalty;
  }
  return modifier.type === ModifierType.Item && value !== undefined && value > 0;
}

function withoutRemoved(lines: readonly BreakdownLine[], by: FormInPlay, replacement: Replacement): BreakdownLine[] {
  return lines.map((line) =>
    removedByForm(line, replacement)
      ? { ...line, status: { kind: LineStatusKind.Suppressed, by: by.id, reason: SuppressionReason.Form } }
      : line,
  );
}

export function summaryOf(form: FormInPlay, replacement: Omit<FormReplacement, 'summary'>): ModifierLabel {
  const key = replacement.source === FormSource.Form ? EngineMessage.FormReplaces : EngineMessage.FormOwnHigher;
  return {
    message: message(key, { value: replacement.value, own: replacement.own, form: form.origin.entry }),
    named: { param: LabelParam.Form, origin: form.origin },
  };
}

/**
 * The statistic as a battle form leaves it (rules-engine.md, "Battle forms"). Armor Class, the skills the form lists
 * and, when it lists speeds, every speed are set from the form: its value plus the lines that still apply (the form
 * removes item bonuses, so only status, circumstance and untyped lines and item penalties are left). Where the form
 * says "use your own if higher", which it does for Armor Class and by default for a skill, the higher of the form's
 * total and the character's own stands, and the lower is reported beside it. A statistic a set override pinned stays
 * pinned. A form value that has no value fails the statistic; one out of range fails it as a total does.
 */
export function applyForm(
  result: StatisticResult,
  form: FormInPlay | undefined,
  resolve: ResolveReference,
): StatisticResult {
  if (!result.ok || form === undefined || result.pinnedBy !== undefined) {
    return result;
  }
  const replacement = replacementOf(form, result.selector);
  return replacement === undefined ? result : replaced(result, { form, replacement }, resolve);
}

/** The statistic with the form's value in place of its own, or failed when the form's value cannot be had. */
function replaced(
  result: StatisticValue,
  { form, replacement }: Pick<Worked, 'form' | 'replacement'>,
  resolve: ResolveReference,
): StatisticResult {
  const outcome = valueOf(replacement.value, resolve);
  if (!outcome.ok) {
    return failure(result.selector, outcome.error, outcome.position);
  }
  const base = whole(outcome.value);
  const lines = withoutRemoved(result.lines, form, replacement);
  const value = base === undefined ? undefined : appliedTotal(base, lines);
  return base === undefined || value === undefined
    ? totalOutOfRange(result.selector)
    : formResult(result, { form, replacement, lines, base, value });
}

/** The form's value plus the lines that still apply; undefined when it leaves the safe integer range. */
function appliedTotal(base: FormulaValue, lines: readonly BreakdownLine[]): FormulaValue | undefined {
  let sum = 0;
  for (const { status, value } of lines) {
    if (status.kind === LineStatusKind.Applied && value !== undefined) {
      sum += value;
    }
  }
  return whole(base + sum);
}

interface Worked {
  readonly form: FormInPlay;
  readonly replacement: Replacement;
  readonly lines: readonly BreakdownLine[];
  readonly base: FormReplacement['base'];
  readonly value: FormReplacement['value'];
}

function formResult(result: StatisticValue, { form, replacement, lines, base, value }: Worked): StatisticValue {
  const own = result.total;
  const ownStands = replacement.ownIfHigher && own >= value;
  const parts = {
    source: ownStands ? FormSource.Own : FormSource.Form,
    rule: form.id,
    label: form.label,
    base,
    value,
    own,
  };
  const reported: FormReplacement = { ...parts, summary: summaryOf(form, parts) };
  return ownStands
    ? { ...result, form: reported }
    : { ...result, lines, computed: value, total: value, form: reported };
}

/**
 * The facts with the battle form's traits added as the character's own (`self:trait:plant`), so a predicate reads
 * the form's traits beside the ones the character has. The form is picked on the facts as they were here, but
 * a form whose predicate reads a trait it grants is tested again on these, so a form should not depend on its own traits.
 */
export function factsUnderForm(inputs: ModifierInputs): PredicateFacts {
  const traits = battleFormInPlay(inputs)?.form.traits ?? [];
  return traits.length === 0
    ? inputs.facts
    : inputs.facts.plus(traits.map((trait) => RollOption.parse(`${TRAIT_PREFIX}${trait}`)));
}
