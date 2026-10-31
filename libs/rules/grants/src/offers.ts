import { evaluatePredicate, summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts, PredicateSummary } from '@pioneer/rules/predicate';
import { ContentId, RollOptionNamespace } from '@pioneer/rules/sdk';
import type {
  ChoiceOption,
  ChoiceQuery,
  ChoiceSetElement,
  ChoiceValue,
  ContentText,
  OwnedQuery,
} from '@pioneer/rules/sdk';

import { candidateOptions } from './candidate-options';
import type { ChoiceContext } from './choices';
import type { GrantEntry } from './grant-entry';
import { byCodeUnit } from './order';
import type { OwnedItem } from './owned-items';

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

/**
 * Where a predicate reads an entry's own roll options, apart from the character's: a query's candidate
 * (`item:trait:fighter`), or the entry that lists a choice (`item:level`).
 */
const CANDIDATE_NAMESPACE = RollOptionNamespace.parse('item');

/** `context` read for the choices of `owner`: its own roll options under `item:`, so a choice can gate on its level. Skill ranks are not yet worked out, so a choice that gates on one is offered. */
export function contextOf(context: ChoiceContext, owner: GrantEntry): ChoiceContext {
  return {
    ...context,
    facts: context.facts.withRanksUnread().withNamespace(CANDIDATE_NAMESPACE, owner.rollOptions),
  };
}

/** By name, then id, so the list a builder shows keeps its order. */
function byLabel(left: OfferedOption, right: OfferedOption): number {
  return byCodeUnit(left.label, right.label) || byCodeUnit(left.value, right.value);
}

/**
 * Whether the candidate carries a trait named like the character's class or ancestry, when the query asks for one
 * (`ownTrait`); with two classes (Dual Class) either will do. A query that asks for none is met by every candidate.
 */
function sharesOwnTrait({ ownTrait }: ChoiceQuery, candidateFacts: PredicateFacts): boolean {
  if (ownTrait === undefined) {
    return true;
  }
  return candidateFacts.tails(ownTrait).some((slug) => candidateFacts.has(`item:trait:${slug}`));
}

/**
 * Every entry of the query's kind whose filter is not false, read against the character's facts with the entry's
 * own options under `item:`. One whose filter is unknown carries when it would hold. Sorted by name, then id. An entry
 * of an unsupported pack is left out unless it is the `held` pick: a character keeps what it has from such a pack but
 * takes nothing new from it.
 */
function queriedOptions(query: ChoiceQuery, context: ChoiceContext, held: ChoiceValue | undefined): OfferedOption[] {
  const { facts, lookup } = context;
  const { kind, filter } = query;
  const offered = lookup.ofKind(kind).flatMap((candidate): OfferedOption[] => {
    if (candidate.facts?.unsupported === true && candidate.id !== held) {
      return [];
    }
    const candidateFacts = facts.withNamespace(CANDIDATE_NAMESPACE, candidateOptions(candidate, context));
    if (!sharesOwnTrait(query, candidateFacts)) {
      return [];
    }
    const truth = evaluatePredicate(filter, candidateFacts);
    if (truth === Truth.False) {
      return [];
    }
    const summary = truth === Truth.True ? undefined : summarisePredicate(filter, candidateFacts);
    return [{ value: candidate.id, label: candidate.name, summary }];
  });
  return offered.toSorted(byLabel);
}

/** Whether `choices` is a query of the items the character owns, not of content. */
function isOwnedQuery(choices: ChoiceQuery | OwnedQuery): choices is OwnedQuery {
  return 'ownedKinds' in choices;
}

/** The facts for one owned item: its own roll options under `item:`. */
function ownedFacts(item: OwnedItem, { facts }: ChoiceContext): PredicateFacts {
  return facts.withNamespace(CANDIDATE_NAMESPACE, item.rollOptions);
}

/** The owned item the query reaches whose filter is not false, as an option; unknown carries when it would hold. */
function ownedOption(query: OwnedQuery, item: OwnedItem, context: ChoiceContext): OfferedOption | undefined {
  if (!query.ownedKinds.includes(item.kind)) {
    return undefined;
  }
  const itemFacts = ownedFacts(item, context);
  const truth = evaluatePredicate(query.filter, itemFacts);
  if (truth === Truth.False) {
    return undefined;
  }
  return {
    value: item.slug,
    label: item.name,
    summary: truth === Truth.True ? undefined : summarisePredicate(query.filter, itemFacts),
  };
}

/** Every owned item of the query's kinds whose filter is not false, sorted by name, then slug. */
function ownedOptions(query: OwnedQuery, context: ChoiceContext): OfferedOption[] {
  const offered = context.owned.flatMap((item): OfferedOption[] => {
    const option = ownedOption(query, item, context);
    return option === undefined ? [] : [option];
  });
  return offered.toSorted(byLabel);
}

export function offeredOptions(
  { choices }: ChoiceSetElement,
  context: ChoiceContext,
  held?: ChoiceValue,
): OfferedOption[] {
  if (Array.isArray(choices)) {
    return listedOptions(choices, context.facts);
  }
  return isOwnedQuery(choices) ? ownedOptions(choices, context) : queriedOptions(choices, context, held);
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
function isQueried(query: ChoiceQuery, value: ChoiceValue, context: ChoiceContext): boolean {
  const { facts, lookup } = context;
  const { kind, filter } = query;
  const id = ContentId.safeParse(value);
  const candidate = id.success ? lookup.entry(id.data) : undefined;
  if (candidate?.kind !== kind) {
    return false;
  }
  const candidateFacts = facts.withNamespace(CANDIDATE_NAMESPACE, candidateOptions(candidate, context));
  return sharesOwnTrait(query, candidateFacts) && evaluatePredicate(filter, candidateFacts) !== Truth.False;
}

/** Whether `value` is the slug of an owned item the query reaches. */
function isOwned(query: OwnedQuery, value: ChoiceValue, context: ChoiceContext): boolean {
  const item = context.owned.find((each) => each.slug === value && query.ownedKinds.includes(each.kind));
  return item !== undefined && ownedOption(query, item, context) !== undefined;
}

/** Whether the slot offers `value`, without working out the rest of what it offers. */
export function isOffered({ choices }: ChoiceSetElement, value: ChoiceValue, context: ChoiceContext): boolean {
  if (Array.isArray(choices)) {
    return isListed(choices, value, context.facts);
  }
  return isOwnedQuery(choices) ? isOwned(choices, value, context) : isQueried(choices, value, context);
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
