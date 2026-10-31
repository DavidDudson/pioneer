import { evaluatePredicate, summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts, PredicateSummary } from '@pioneer/rules/predicate';
import { OriginHopKind, RuleIndex } from '@pioneer/rules/sdk';
import type {
  ConditionValue,
  ContentId,
  GrantItemElement,
  Origin,
  OriginHop,
  Predicate,
  RuleSlug,
  SlotKey,
  Take,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { choiceTarget, readChoices } from './choices';
import type {
  AnsweredSlot,
  ChoiceContext,
  ChoicePicks,
  ChoiceSlot,
  EntryAt,
  EntryChoices,
  GrantTarget,
} from './choices';
import { withoutOverridden } from './condition-overrides';
import type { ContentLookup, GrantEntry, GrantError, GrantRoot } from './grant-entry';
import { blockedAt, byEntry, isGrant, itemOf, originOf } from './grant-visit';
import type { Visit } from './grant-visit';
import { GrantsMessage } from './messages';
import { FIRST_TAKE, nextTake, viaOf } from './takes';

/** An entry on the character, with the chain of hops that put it there. */
export interface GrantedItem {
  readonly entry: GrantEntry;
  readonly origin: Origin;
  /** Which take of the entry this is: 1, unless a repeatable feat was taken again in another slot. */
  readonly take: Take;
  /** The name the granting element gave it, for later elements to refer to. */
  readonly flag: RuleSlug | undefined;
  /**
   * The highest value a valued condition arrived with: its condition hop's as a root (_frightened 2_), its grant's or 1
   * when granted. None for an entry that is no valued condition, or a root put on without one.
   */
  readonly value: ConditionValue | undefined;
}

/** A grant whose predicate is unknown on the static sheet: not on the character, and shown with when it would be. */
export interface ConditionalGrant {
  readonly entry: GrantEntry;
  readonly origin: Origin;
  readonly predicate: Predicate;
  readonly summary: PredicateSummary;
}

/**
 * One walk of the grants against fixed facts: every entry in play with its origin, the grants skipped because the
 * entry was already there, the grants that depend on the situation, the choices made and still to make, and what
 * failed.
 */
export interface GrantWalk {
  readonly items: readonly GrantedItem[];
  /** Grants of an entry already on the character, without `allowDuplicate`. */
  readonly duplicates: readonly GrantedItem[];
  readonly conditional: readonly ConditionalGrant[];
  /** Choices the player has yet to make, or whose pick is not on offer. */
  readonly open: readonly ChoiceSlot[];
  readonly answered: readonly AnsweredSlot[];
  readonly errors: readonly GrantError[];
}

/** What one walk reads: the roots, the content, the facts every predicate is tested against, and the picks. */
export interface WalkInputs {
  readonly roots: readonly GrantRoot[];
  readonly lookup: ContentLookup;
  readonly facts: PredicateFacts;
  readonly picks: ChoicePicks;
}

/** A `GrantItem` and the hop it adds to what it grants. */
interface GrantAt {
  readonly element: GrantItemElement;
  readonly hop: OriginHop;
}

/** Walks grants depth first, in root order then rule order, recording what it finds. */
class Walker {
  readonly #lookup: ContentLookup;
  readonly #facts: PredicateFacts;
  readonly #context: ChoiceContext;
  /** Where each entry on the character sits in `#items`. */
  readonly #present = new Map<ContentId, number>();
  /** How many times each entry is on the character. */
  readonly #takes = new Map<ContentId, Take>();
  /** The slot whose pick put each take of an entry there (see `viaOf`), in take order. */
  readonly #vias = new Map<ContentId, (SlotKey | undefined)[]>();
  /** The takes of entries whose slots are recorded, as `<entry>#<take>`. */
  readonly #chosen = new Set<string>();
  readonly #items: GrantedItem[] = [];
  readonly #duplicates: GrantedItem[] = [];
  readonly #conditional: ConditionalGrant[] = [];
  readonly #open: ChoiceSlot[] = [];
  readonly #answered: AnsweredSlot[] = [];
  readonly #errors: GrantError[] = [];

  public constructor({ lookup, facts, picks }: WalkInputs) {
    this.#lookup = lookup;
    this.#facts = facts;
    this.#context = { facts, picks, lookup };
  }

  public get walk(): GrantWalk {
    return {
      items: withoutOverridden(this.#items),
      duplicates: this.#duplicates,
      conditional: this.#conditional,
      open: this.#open,
      answered: this.#answered,
      errors: this.#errors,
    };
  }

  public root({ entry, hop }: GrantRoot): void {
    const picked = hop.kind === OriginHopKind.Choice;
    this.#visit(entry, { hops: [hop], chain: [], flag: undefined, allowDuplicate: false, picked, value: undefined });
  }

  #find(id: ContentId, hops: readonly OriginHop[]): GrantEntry | undefined {
    const entry = this.#lookup.entry(id);
    if (entry === undefined) {
      this.#errors.push({ error: message(GrantsMessage.UnknownEntry, { entry: id }), hops });
    }
    return entry;
  }

  /** The entry to add next, or undefined after recording why it cannot be: missing, in a cycle, or too deep. */
  #reach(id: ContentId, visit: Visit): GrantEntry | undefined {
    const entry = this.#find(id, visit.hops);
    const blocked = entry === undefined ? undefined : blockedAt(entry, visit);
    if (blocked !== undefined) {
      this.#errors.push({ error: blocked, hops: visit.hops });
      return undefined;
    }
    return entry;
  }

  #visit(id: ContentId, visit: Visit): void {
    const entry = this.#reach(id, visit);
    if (entry === undefined) {
      return;
    }
    const at = this.#present.get(id);
    const taken = this.#takes.get(id) ?? FIRST_TAKE;
    const take = at === undefined || visit.allowDuplicate ? taken : nextTake(entry, taken, visit.picked);
    if (at !== undefined && take === undefined) {
      this.#duplicate(at, itemOf(entry, taken, visit));
      return;
    }
    this.#add(at, itemOf(entry, take ?? taken, visit), visit);
  }

  /** Records a grant of an entry already on the character at `at`, and raises its value if this brings a higher one. */
  #duplicate(at: number, item: GrantedItem): void {
    this.#duplicates.push(item);
    this.#raise(at, item.value);
  }

  /** Puts `item` on the character (as a further take if `at` is where an earlier take sits), then follows it. */
  #add(at: number | undefined, item: GrantedItem, visit: Visit): void {
    this.#present.set(item.entry.id, at ?? this.#items.length);
    this.#takes.set(item.entry.id, item.take);
    this.#items.push(item);
    this.#follow(item, visit);
  }

  /**
   * Raises the value of the entry at `at` to `value` when a later arrival brings a higher one, so the entry on the
   * character holds its highest value, as its facts do.
   */
  #raise(at: number, value: ConditionValue | undefined): void {
    const present = this.#items[at];
    if (present !== undefined && value !== undefined && (present.value === undefined || value > present.value)) {
      this.#items[at] = { ...present, value };
    }
  }

  /** `entry` as take `take`, with the slots that put its takes there; this take's own is noted the first time it is followed. */
  #entryAt({ entry, take }: GrantedItem, visit: Visit): EntryAt {
    const vias = this.#vias.get(entry.id) ?? [];
    if (take > vias.length) {
      vias.push(visit.picked ? viaOf(entry, visit.hops) : undefined);
    }
    this.#vias.set(entry.id, vias);
    return { entry, take, via: vias[take - 1], before: vias.slice(0, take - 1), hops: visit.hops };
  }

  /** Records the choices of `item`'s entry, then follows each `GrantItem` on it, in rule order. */
  #follow(item: GrantedItem, visit: Visit): void {
    const { entry } = item;
    const at = this.#entryAt(item, visit);
    const choices = this.#choose(at);
    const chain = [...visit.chain, entry];
    for (const [index, element] of entry.rules.entries()) {
      if (isGrant(element)) {
        this.#followGrant({ at, choices }, { element, index }, { ...visit, chain });
      }
    }
  }

  /** Follows the `GrantItem` `element`, rule `index` of the entry at `at`, unless its pick is still to make. */
  #followGrant(
    { at, choices }: { readonly at: EntryAt; readonly choices: EntryChoices },
    { element, index }: { readonly element: GrantItemElement; readonly index: number },
    visit: Visit,
  ): void {
    const hop: OriginHop = { kind: OriginHopKind.Grant, by: at.entry.id, rule: RuleIndex.parse(index) };
    const target = this.#target(at, { element, hop }, choices);
    if (target !== undefined) {
      const hops = [...visit.hops, ...target.hops, hop];
      const allowDuplicate = element.allowDuplicate === true;
      const picked = typeof element.item !== 'string';
      const arrival = { hops, chain: visit.chain, flag: element.flag, allowDuplicate, picked, value: element.value };
      this.#grant(element, target.id, arrival);
    }
  }

  /**
   * Reads the entry's choices, and records its slots the first time the entry is followed. A copy granted again
   * with `allowDuplicate` shares its slots (and so its picks), so they are not reported twice.
   */
  #choose(at: EntryAt): EntryChoices {
    const choices = readChoices(at, this.#context);
    const chosen = `${at.entry.id}#${at.take}`;
    if (this.#chosen.has(chosen)) {
      return choices;
    }
    this.#chosen.add(chosen);
    this.#open.push(...choices.open);
    this.#answered.push(...choices.answered);
    this.#errors.push(...choices.errors);
    return choices;
  }

  /**
   * What `element` grants; undefined while its pick is still to make, or after recording why it cannot grant, at
   * the element's own grant hop.
   */
  #target(at: EntryAt, { element, hop }: GrantAt, choices: EntryChoices): GrantTarget | undefined {
    const { item } = element;
    if (typeof item === 'string') {
      return { id: item, hops: [] };
    }
    const target = choiceTarget(at, item.choice, choices);
    if (target !== undefined && 'error' in target) {
      this.#errors.push({ error: target.error, hops: [...target.hops, hop] });
      return undefined;
    }
    return target;
  }

  /** Follows a grant whose predicate holds; records one that depends on the situation; drops one that fails. */
  #grant(element: GrantItemElement, id: ContentId, visit: Visit): void {
    const { predicate } = element;
    const truth = predicate === undefined ? Truth.True : evaluatePredicate(predicate, this.#facts);
    if (truth === Truth.True) {
      this.#visit(id, visit);
      return;
    }
    if (truth === Truth.False || predicate === undefined) {
      return;
    }
    const summary = summarisePredicate(predicate, this.#facts, element.display?.summary);
    const entry = this.#find(id, visit.hops);
    if (entry !== undefined && summary !== undefined) {
      this.#conditional.push({ entry, origin: originOf(entry, visit.hops), predicate, summary });
    }
  }
}

/**
 * Resolves `GrantItem` elements from the character's roots down, depth first. Roots are taken in entry id order,
 * so the result does not depend on the order they are given in. An entry already on the character is a duplicate
 * unless its grant allows one. A grant back to an entry above it is a cycle, reported once and not followed. A
 * missing entry is an error at its grant; the other grants still resolve.
 *
 * Each `ChoiceSet` whose predicate holds is a slot, keyed by its entry and rule index. A pick among the
 * offered options answers it, and a `GrantItem { choice }` on the same entry grants the picked entry behind a
 * `choice` hop. A slot with no pick, or a pick no longer on offer, is open, and its grants wait. A `ChoiceSet` with a
 * query offers every entry of its kind whose filter is not false, reading the entry's own roll options under `item:`.
 *
 * One walk reads fixed facts; `resolveGrants` walks again as the facts the result sets change.
 */
export function walkGrants(inputs: WalkInputs): GrantWalk {
  const walker = new Walker(inputs);
  for (const root of inputs.roots.toSorted(byEntry)) {
    walker.root(root);
  }
  return walker.walk;
}
