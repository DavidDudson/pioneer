import { FormulaText, parseFormula, references } from '@pioneer/rules/formula';
import type { FormulaReference, TextPosition } from '@pioneer/rules/formula';
import { issueParams, message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { fromFoundryPath, knownReference, REFERENCE_CATALOGUE, ReferenceScope } from './formula-reference';
import { RulesMessage } from './messages';

/** What is wrong with a formula, and where (1-based) in its text. The descriptor carries the position too. */
export interface FormulaProblem {
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
}

const SIGIL = '@';

/** Every descriptor names its position, so a field issue can point into the formula even when its text does not. */
function problem(error: MessageDescriptor, position: TextPosition): FormulaProblem {
  return { error: message(error.key, { ...error.params, position }), position };
}

function referenceProblem(
  { path, position }: FormulaReference,
  scopes: ReadonlySet<ReferenceScope>,
): FormulaProblem | undefined {
  const found = `${SIGIL}${path}`;
  const known = knownReference(path);
  if (known !== undefined) {
    const inScope = scopes.has(REFERENCE_CATALOGUE[known.kind].scope);
    return inScope ? undefined : problem(message(RulesMessage.ReferenceOutOfScope, { found }), position);
  }
  const translated = fromFoundryPath(path);
  return translated === undefined
    ? problem(message(RulesMessage.UnknownReference, { found }), position)
    : problem(message(RulesMessage.FoundryReference, { found, suggestion: `${SIGIL}${translated}` }), position);
}

/**
 * What stops `text` from being a stored formula whose references may read `scopes`: the parse error, or one
 * problem per reference the vocabulary does not know or the scopes leave out (ADR-0016). Empty when it is fine.
 */
export function formulaProblems(text: FormulaText, scopes: ReadonlySet<ReferenceScope>): readonly FormulaProblem[] {
  const parsed = parseFormula(text);
  if (!parsed.ok) {
    return [problem(parsed.error, parsed.position)];
  }
  return references(parsed.formula).flatMap((reference) => referenceProblem(reference, scopes) ?? []);
}

/** A rule element sits on a content entry that may or may not be an item, so its formulas may read either. */
const RULE_ELEMENT_SCOPES: ReadonlySet<ReferenceScope> = new Set(Object.values(ReferenceScope));

/**
 * A value written as a formula (`@level`, `max(1, floor(@item.level / 2))`), kept as its source text. It must
 * parse, and every reference must be one the vocabulary knows; a failure is a field issue whose descriptor names
 * the position in the formula.
 */
export const FormulaSource = z
  .string()
  .check((context) => {
    for (const { error } of formulaProblems(FormulaText.parse(context.value), RULE_ELEMENT_SCOPES)) {
      context.issues.push({ code: 'custom', input: context.value, ...issueParams(error) });
    }
  })
  .brand<'FormulaSource'>();
export type FormulaSource = z.infer<typeof FormulaSource>;
