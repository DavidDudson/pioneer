import { FormulaText, parseFormula, references } from '@pioneer/rules/formula';
import type { FormulaReference, TextPosition } from '@pioneer/rules/formula';
import { issueParams, message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { fromFoundryPath, knownReference, REFERENCE_CATALOGUE, ReferenceScope } from './formula-reference';
import type { KnownReference } from './formula-reference';
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

function inScope(reference: KnownReference, scopes: ReadonlySet<ReferenceScope>): boolean {
  return scopes.has(REFERENCE_CATALOGUE[reference.kind].scope);
}

function referenceProblem(
  { path, position }: FormulaReference,
  scopes: ReadonlySet<ReferenceScope>,
): FormulaProblem | undefined {
  const found = `${SIGIL}${path}`;
  const outOfScope = problem(message(RulesMessage.ReferenceOutOfScope, { found }), position);
  const known = knownReference(path);
  if (known !== undefined) {
    return inScope(known, scopes) ? undefined : outOfScope;
  }
  const translated = fromFoundryPath(path);
  if (translated === undefined) {
    return problem(message(RulesMessage.UnknownReference, { found }), position);
  }
  // Suggesting Pioneer's spelling only helps when that spelling is allowed here.
  const target = knownReference(translated);
  return target === undefined || inScope(target, scopes)
    ? problem(message(RulesMessage.FoundryReference, { found, suggestion: `${SIGIL}${translated}` }), position)
    : outOfScope;
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

/** A statistic's base formula belongs to the character, with no item to read. */
const ACTOR_SCOPES: ReadonlySet<ReferenceScope> = new Set([ReferenceScope.Actor]);

/** One custom issue per problem with `text` as a formula reading `scopes`, for a schema's `check`. */
export function formulaIssues(
  text: FormulaText,
  scopes: ReadonlySet<ReferenceScope> = RULE_ELEMENT_SCOPES,
): z.core.$ZodRawIssue[] {
  return formulaProblems(text, scopes).map(({ error }) => {
    const { params } = issueParams(error);
    return { code: 'custom', input: text, params };
  });
}

type FormulaSourceSchema = z.core.$ZodBranded<z.ZodString, 'FormulaSource'>;

/** Stored formula text whose references may read `scopes`; each problem is a field issue (see `FormulaSource`). */
function checkedFormula(scopes: ReadonlySet<ReferenceScope>): FormulaSourceSchema {
  return z
    .string()
    .check((context) => {
      context.issues.push(...formulaIssues(FormulaText.parse(context.value), scopes));
    })
    .brand<'FormulaSource'>();
}

/**
 * A value written as a formula (`@level`, `max(1, floor(@item.level / 2))`), kept as its source text. It must
 * parse, and every reference must be one the vocabulary knows; a failure is a field issue whose descriptor names
 * the position in the formula.
 */
export const FormulaSource = checkedFormula(RULE_ELEMENT_SCOPES);
export type FormulaSource = z.infer<typeof FormulaSource>;

/** A `FormulaSource` that reads only the character's values, as a statistic's base formula must. */
export const ActorFormulaSource = checkedFormula(ACTOR_SCOPES);
