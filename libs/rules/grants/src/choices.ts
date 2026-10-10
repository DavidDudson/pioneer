import { evaluatePredicate, RollOptionNamespace, summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts, PredicateSummary } from '@pioneer/rules/predicate';
import { ContentId, OriginHopKind, RollOption, RuleElementKey, RuleIndex, SlotKey } from '@pioneer/rules/sdk';
import type {
  ChoiceOption,
  ChoiceQuery,
  ChoiceSetElement,
  ChoiceValue,
  ContentText,
  Origin,
  OriginHop,
  RuleElement,
  RuleSlug,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { ContentLookup, GrantEntry, GrantError } from './grant-entry';
import { GrantsMessage } from './messages';
import { byCodeUnit } from './order';

/** An option the player may pick. `summary` says when it applies, for one whose predicate is unknown. */
export interface OfferedOption {
  readonly value: ChoiceValue;
  readonly label: ContentText;
  readonly summary: PredicateSummary | undefined;
}

/** A `ChoiceSet` on the character: where it is, what it asks and what it offers. */
export interface ChoiceSlot {
  readonly key: SlotKey;
  /** The name the pick is stored under, for `GrantItem { choice }` on the same entry. */
  readonly flag: RuleSlug;
  /** Hops down to the entry holding the `ChoiceSet`. */
  readonly origin: Origin;
  readonly rule: RuleIndex;
  readonly prompt: ContentText | undefined;
  readonly options: readonly OfferedOption[];
}

/** A slot the player has answered with one of its offered options. */
export interface AnsweredSlot extends ChoiceSlot {
  readonly pick: ChoiceValue;
  /** `<rollOption>:<pick>`, for a `ChoiceSet` with a `rollOption`. */
  readonly option: RollOption | undefined;
}

/** The character's answers, by slot. A pick for a slot no longer on the character is ignored. */
export type ChoicePicks = ReadonlyMap<SlotKey, ChoiceValue>;

/** What choices are read against: the facts for predicates, the player's picks, and the content queries offer. */
export interface ChoiceContext {
  readonly facts: PredicateFacts;
  readonly picks: ChoicePicks;
  readonly lookup: ContentLookup;
}

/** An entry on the character and the hops down to it. */
export interface EntryAt {
  readonly entry: GrantEntry;
  readonly hops: readonly OriginHop[];
}

/** A pick that stands: one of the options its slot offers. */
interface Pick {
  readonly slot: SlotKey;
  readonly value: ChoiceValue;
}

/** Everything one entry's `ChoiceSet`s produce, and the picks that stand by flag (the first slot wins a flag). */
export interface EntryChoices {
  readonly picks: ReadonlyMap<RuleSlug, Pick>;
  /** Every flag the entry's `ChoiceSet`s declare, whether or not their slot is open. */
  readonly flags: ReadonlySet<RuleSlug>;
  readonly open: readonly ChoiceSlot[];
  readonly answered: readonly AnsweredSlot[];
  readonly errors: readonly GrantError[];
}

/** What a `GrantItem` grants, and the hops between its entry and its own grant hop (a pick's choice hop). */
export interface GrantTarget {
  readonly id: ContentId;
  readonly hops: readonly OriginHop[];
}

/** A `ChoiceSet` and its place in its entry's rules. */
interface IndexedChoice {
  readonly element: ChoiceSetElement;
  readonly rule: RuleIndex;
}

function isChoiceSet(element: RuleElement): element is ChoiceSetElement {
  return element.key === RuleElementKey.ChoiceSet;
}

/**
 * The slot of rule `rule` on entry `entry`. The entry is on the character once (a duplicate is skipped), so the
 * pair names one slot, and stays the same however the entry got there.
 */
export function slotKeyOf(entry: ContentId, rule: RuleIndex): SlotKey {
  return SlotKey.parse(`${entry}:${rule}`);
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

function offeredOptions({ choices }: ChoiceSetElement, context: ChoiceContext): OfferedOption[] {
  return Array.isArray(choices) ? listedOptions(choices, context.facts) : queriedOptions(choices, context);
}

const choiceHop = (slot: SlotKey): OriginHop => ({ kind: OriginHopKind.Choice, slot });

/** Collects one entry's slots, answered and open, as it reads them in rule order. */
class ChoiceReader {
  readonly #at: EntryAt;
  readonly #context: ChoiceContext;
  readonly #picks = new Map<RuleSlug, Pick>();
  readonly #flags = new Set<RuleSlug>();
  readonly #open: ChoiceSlot[] = [];
  readonly #answered: AnsweredSlot[] = [];
  readonly #errors: GrantError[] = [];

  public constructor(at: EntryAt, context: ChoiceContext) {
    this.#at = at;
    this.#context = context;
  }

  public get choices(): EntryChoices {
    return {
      picks: this.#picks,
      flags: this.#flags,
      open: this.#open,
      answered: this.#answered,
      errors: this.#errors,
    };
  }

  /** Records the slot, if its own predicate is true, as answered by a pick on offer or as open. */
  public read({ element, rule }: IndexedChoice): void {
    this.#flags.add(element.flag);
    const { predicate } = element;
    if (predicate !== undefined && evaluatePredicate(predicate, this.#context.facts) !== Truth.True) {
      return;
    }
    const slot = this.#slot({ element, rule });
    const value = this.#context.picks.get(slot.key);
    if (value === undefined) {
      this.#open.push(slot);
    } else if (slot.options.some((offered) => offered.value === value)) {
      const option = element.rollOption === undefined ? undefined : RollOption.parse(`${element.rollOption}:${value}`);
      this.#answer({ ...slot, pick: value, option });
    } else {
      this.#refuse(slot, value);
    }
  }

  /** A pick that is not on offer: an error naming it and the slot, and the slot open again. */
  #refuse(slot: ChoiceSlot, value: ChoiceValue): void {
    const { entry, hops } = this.#at;
    const error = message(GrantsMessage.PickNotOffered, { entry: entry.name, value });
    this.#errors.push({ error, hops: [...hops, choiceHop(slot.key)] });
    this.#open.push(slot);
  }

  #slot({ element, rule }: IndexedChoice): ChoiceSlot {
    const { entry, hops } = this.#at;
    const origin: Origin = { hops: [...hops], entry: entry.id, sources: [...entry.sources] };
    const options = offeredOptions(element, this.#context);
    return { key: slotKeyOf(entry.id, rule), flag: element.flag, origin, rule, prompt: element.prompt, options };
  }

  #answer(slot: AnsweredSlot): void {
    this.#answered.push(slot);
    if (!this.#picks.has(slot.flag)) {
      this.#picks.set(slot.flag, { slot: slot.key, value: slot.pick });
    }
  }
}

/**
 * Each `ChoiceSet` on the entry whose predicate holds, as a slot keyed by the entry and rule index. It offers its
 * listed options, or the entries its query matches. A pick among the offered options answers it; with `rollOption`,
 * it also sets `<rollOption>:<pick>`. A slot with no pick, or a pick no longer on offer, is open; so is a query that
 * matches nothing, with an empty offer.
 */
export function readChoices(at: EntryAt, context: ChoiceContext): EntryChoices {
  const reader = new ChoiceReader(at, context);
  for (const [index, element] of at.entry.rules.entries()) {
    if (isChoiceSet(element)) {
      reader.read({ element, rule: RuleIndex.parse(index) });
    }
  }
  return reader.choices;
}

/**
 * The entry a `GrantItem { choice: flag }` on `at` grants: the pick stored under `flag`, behind its choice hop.
 * Undefined while the pick is still to make; an error when no `ChoiceSet` on the entry has the flag, or when the
 * pick is a plain option rather than an entry.
 */
export function choiceTarget(at: EntryAt, flag: RuleSlug, choices: EntryChoices): GrantTarget | GrantError | undefined {
  const { entry, hops } = at;
  const pick = choices.picks.get(flag);
  if (pick === undefined) {
    const declared = choices.flags.has(flag);
    return declared ? undefined : { error: message(GrantsMessage.UnknownChoice, { entry: entry.name, flag }), hops };
  }
  const pickHops = [choiceHop(pick.slot)];
  const id = ContentId.safeParse(pick.value);
  if (!id.success) {
    const error = message(GrantsMessage.PickNotEntry, { flag, value: pick.value });
    return { error, hops: [...hops, ...pickHops] };
  }
  return { id: id.data, hops: pickHops };
}
