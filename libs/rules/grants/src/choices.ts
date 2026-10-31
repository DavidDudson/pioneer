import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentId, OriginHopKind, RuleElementKey, RuleIndex } from '@pioneer/rules/sdk';
import type {
  ChoiceSetElement,
  ChoiceValue,
  ContentText,
  Origin,
  OriginHop,
  RollOption,
  RuleElement,
  RuleSlug,
  SlotKey,
  Take,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import type { ContentLookup, GrantEntry, GrantError } from './grant-entry';
import { GrantsMessage } from './messages';
import { contextOf, isOffered, Offer, offeredOptions } from './offers';
import type { OfferedOption } from './offers';
import { optionOf } from './option-of';
import { earlierPicks, slotKeyOf } from './takes';

/**
 * A `ChoiceSet` on the character: where it is, what it asks and what it offers. `options` is worked out the first
 * time it is read, against the facts its walk read (for a settled resolution, its `facts`): no round of resolution
 * needs it, so a query over every entry of its kind runs only for a builder that shows it.
 */
export interface ChoiceSlot {
  readonly key: SlotKey;
  /** Which take of its entry holds it: 1 for an entry taken once, the second Domain Initiate's slots are take 2. */
  readonly take: Take;
  /** The name the pick is stored under, for `GrantItem { choice }` on the same entry. */
  readonly flag: RuleSlug;
  /** Hops down to the entry holding the `ChoiceSet`. */
  readonly origin: Origin;
  readonly rule: RuleIndex;
  readonly prompt: ContentText | undefined;
  /** Whether the player may leave it unanswered. */
  readonly optional: boolean;
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
  readonly take: Take;
  /** The slot whose pick put this take there, for a repeatable feat: it names the take's slots. */
  readonly via: SlotKey | undefined;
  /** The `via` of each earlier take of the entry, in take order. */
  readonly before: readonly (SlotKey | undefined)[];
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

/** What answering a slot adds to it. */
type SlotAnswer = Omit<AnsweredSlot, keyof ChoiceSlot>;

/** Where a slot is and what it asks: everything but its offer. */
type SlotPlace = Omit<ChoiceSlot, 'options'>;

/** `place` with its `options` read from `offer`, as a property like any other, so a slot copies and compares whole. */
function slotOf(place: SlotPlace, offer: Offer): ChoiceSlot {
  return {
    ...place,
    get options(): readonly OfferedOption[] {
      return offer.options;
    },
  };
}

/** `slotOf`, answered with `pick`. */
function answeredOf(place: SlotPlace, offer: Offer, answer: SlotAnswer): AnsweredSlot {
  return {
    ...place,
    ...answer,
    get options(): readonly OfferedOption[] {
      return offer.options;
    },
  };
}

const choiceHop = (slot: SlotKey): OriginHop => ({ kind: OriginHopKind.Choice, slot });

/**
 * What a pick is called in the roll option it sets: an entry's slug less its kind, as Foundry names an item pick
 * (`feat:order-explorer:leaf-order`), else the plain option as it is.
 */
function pickName(value: ChoiceValue, lookup: ContentLookup): string {
  const id = ContentId.safeParse(value);
  return (id.success ? lookup.entry(id.data)?.slug : undefined) ?? value;
}

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
    this.#context = contextOf(context, at.entry);
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
    const place = this.#place({ element, rule });
    const value = this.#context.picks.get(place.key);
    if (value === undefined) {
      this.#open.push(slotOf(place, this.#offer(element, place, this.#context)));
    } else {
      this.#readPick({ element, place }, value);
    }
  }

  /**
   * A pick is read apart from the roll option it sets itself: Specialty Crafting offers each specialty unless
   * `feat:specialty-crafting:<specialty>` is set, and a pick would otherwise rule itself out and never settle.
   */
  #readPick(
    { element, place }: { readonly element: ChoiceSetElement; readonly place: SlotPlace },
    value: ChoiceValue,
  ): void {
    const option =
      element.rollOption === undefined
        ? undefined
        : optionOf(element.rollOption, pickName(value, this.#context.lookup));
    const apart = option === undefined ? this.#context : { ...this.#context, facts: this.#context.facts.minus(option) };
    // Order Explorer lists an order unless the druid has it, or this very pick joined it: its own option is the way in.
    const context = isOffered(element, value, apart) ? apart : this.#context;
    const offer = this.#offer(element, place, context);
    if (isOffered(element, value, context) && !this.#earlierPicks(place).has(value)) {
      this.#answer(answeredOf(place, offer, { pick: value, option }));
    } else {
      this.#refuse(slotOf(place, offer), value);
    }
  }

  #earlierPicks(place: SlotPlace): ReadonlySet<ChoiceValue> {
    return earlierPicks({ ...place, entry: this.#at.entry.id, before: this.#at.before }, this.#context.picks);
  }

  /** What the slot offers: the options of `element` less what an earlier take of the entry picked. */
  #offer(element: ChoiceSetElement, place: SlotPlace, context: ChoiceContext): Offer {
    const earlier = this.#earlierPicks(place);
    return new Offer(() => offeredOptions(element, context).filter((option) => !earlier.has(option.value)));
  }

  /** A pick that is not on offer: an error naming it and the slot, and the slot open again. */
  #refuse(slot: ChoiceSlot, value: ChoiceValue): void {
    const { entry, hops } = this.#at;
    const error = message(GrantsMessage.PickNotOffered, { entry: entry.name, value });
    this.#errors.push({ error, hops: [...hops, choiceHop(slot.key)] });
    this.#open.push(slot);
  }

  #place({ element, rule }: IndexedChoice): SlotPlace {
    const { entry, hops } = this.#at;
    const origin: Origin = { hops: [...hops], entry: entry.id, sources: [...entry.sources] };
    return {
      key: slotKeyOf(entry.id, rule, this.#at.via),
      take: this.#at.take,
      flag: element.flag,
      origin,
      rule,
      prompt: element.prompt,
      optional: element.optional === true,
    };
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
