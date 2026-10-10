import { evaluatePredicate, RollOptionNamespace, summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts, PredicateSummary } from '@pioneer/rules/predicate';
import { ContentId } from '@pioneer/rules/sdk';
import type { ChoiceOption, ChoiceQuery, ChoiceSetElement, ChoiceValue, ContentText } from '@pioneer/rules/sdk';

import type { ChoiceContext } from './choices';
import { byCodeUnit } from './order';

/** An option the player may pick. `summary` says when it applies, for one whose predicate is unknown. */
export interface OfferedOption {
  readonly value: ChoiceValue;
  readonly label: ContentText;
  readonly summary: PredicateSummary | undefined;
}

/** The listed options whose predicate is not false; one that is unknown carries when it would hold. */
function listedOptions(choices: readonly ChoiceOption[], facts: PredicateFacts): OfferedOption[] {
  return choices.flatMap(({ value, label, predicate }): OfferedOption[] => {
    if (predicate === undefined) {
      return [{ value, label, summary: undefined }];
    }
    const truth = evaluatePredicate(predicate, facts);
    return truth === Truth.False ? [] : [{ value, label, summary: summarisePredicate(predicate, facts) }];
  });
}

/** Where a query reads a candidate entry's own roll options, apart from the character's: `item:trait:fighter`. */
const CANDIDATE_NAMESPACE = RollOptionNamespace.parse('item');

/** By name, then id, so the list a builder shows keeps its order. */
function byLabel(left: OfferedOption, right: OfferedOption): number {
  return byCodeUnit(left.label, right.label) || byCodeUnit(left.value, right.value);
}

/**
 * Every entry of the query's kind whose filter is not false, read against the character's facts with the entry's
 * own options under `item:`. One whose filter is unknown carries when it would hold. Sorted by name, then id.
 */
function queriedOptions({ kind, filter }: ChoiceQuery, { facts, lookup }: ChoiceContext): OfferedOption[] {
  const offered = lookup.ofKind(kind).flatMap((candidate): OfferedOption[] => {
    const candidateFacts = facts.withNamespace(CANDIDATE_NAMESPACE, candidate.rollOptions);
    const truth = evaluatePredicate(filter, candidateFacts);
    if (truth === Truth.False) {
      return [];
    }
    const summary = truth === Truth.True ? undefined : summarisePredicate(filter, candidateFacts);
    return [{ value: candidate.id, label: candidate.name, summary }];
  });
  return offered.toSorted(byLabel);
}

export function offeredOptions({ choices }: ChoiceSetElement, context: ChoiceContext): OfferedOption[] {
  return Array.isArray(choices) ? listedOptions(choices, context.facts) : queriedOptions(choices, context);
}

/** Whether `value` is a listed option whose predicate is not false. */
function isListed(choices: readonly ChoiceOption[], value: ChoiceValue, facts: PredicateFacts): boolean {
  return choices.some(
    (choice) =>
      choice.value === value &&
      (choice.predicate === undefined || evaluatePredicate(choice.predicate, facts) !== Truth.False),
  );
}

/** Whether `value` is an entry of the query's kind whose filter is not false: the query tested on that one entry. */
function isQueried({ kind, filter }: ChoiceQuery, value: ChoiceValue, { facts, lookup }: ChoiceContext): boolean {
  const id = ContentId.safeParse(value);
  const candidate = id.success ? lookup.entry(id.data) : undefined;
  if (candidate?.kind !== kind) {
    return false;
  }
  const candidateFacts = facts.withNamespace(CANDIDATE_NAMESPACE, candidate.rollOptions);
  return evaluatePredicate(filter, candidateFacts) !== Truth.False;
}

/** Whether the slot offers `value`, without working out the rest of what it offers. */
export function isOffered({ choices }: ChoiceSetElement, value: ChoiceValue, context: ChoiceContext): boolean {
  return Array.isArray(choices) ? isListed(choices, value, context.facts) : isQueried(choices, value, context);
}

/** A slot's offer, worked out the first time it is read and kept. */
export class Offer {
  readonly #make: () => readonly OfferedOption[];
  #options: readonly OfferedOption[] | undefined = undefined;

  public constructor(make: () => readonly OfferedOption[]) {
    this.#make = make;
  }

  public get options(): readonly OfferedOption[] {
    this.#options ??= this.#make();
    return this.#options;
  }
}
