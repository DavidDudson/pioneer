import { evaluatePredicate, summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts, PredicateSummary } from '@pioneer/rules/predicate';
import { OriginHopKind, RuleElementKey, RuleIndex } from '@pioneer/rules/sdk';
import type {
  ContentId,
  GrantItemElement,
  Origin,
  OriginHop,
  Predicate,
  RuleElement,
  RuleSlug,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

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
import type { ContentLookup, GrantEntry, GrantError, GrantRoot } from './grant-entry';
import { GrantsMessage } from './messages';
import { byCodeUnit } from './order';

/** An entry on the character, with the chain of hops that put it there. */
export interface GrantedItem {
  readonly entry: GrantEntry;
  readonly origin: Origin;
  /** The name the granting element gave it, for later elements to refer to. */
  readonly flag: RuleSlug | undefined;
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

/** Longest chain followed; matches the most hops an `Origin` records. */
const HOPS_MAX = 64;
const LIST_SEPARATOR = ', ';

function isGrant(element: RuleElement): element is GrantItemElement {
  return element.key === RuleElementKey.GrantItem;
}

/** A `GrantItem` and the hop it adds to what it grants. */
interface GrantAt {
  readonly element: GrantItemElement;
  readonly hop: OriginHop;
}

/** How an entry is reached: the hops to it, the entries above it, and what the granting element asked for. */
interface Visit {
  readonly hops: readonly OriginHop[];
  readonly chain: readonly GrantEntry[];
  readonly flag: RuleSlug | undefined;
  readonly allowDuplicate: boolean;
}

function originOf(entry: GrantEntry, hops: readonly OriginHop[]): Origin {
  return { hops: [...hops], entry: entry.id, sources: [...entry.sources] };
}

/** Roots in entry id order, then by how they got there, so the order they are given in never matters. */
function byEntry(left: GrantRoot, right: GrantRoot): number {
  return byCodeUnit(left.entry, right.entry) || byCodeUnit(JSON.stringify(left.hop), JSON.stringify(right.hop));
}

/** Why `entry` cannot be followed from here: it is already above itself, or the chain is too long. */
function blockedAt(entry: GrantEntry, visit: Visit): MessageDescriptor | undefined {
  const start = visit.chain.findIndex((above) => above.id === entry.id);
  if (start !== -1) {
    const loop = visit.chain.slice(start);
    const entries = loop.map((member) => member.name).join(LIST_SEPARATOR);
    return message(GrantsMessage.Cycle, { entries, count: loop.length });
  }
  return visit.hops.length > HOPS_MAX ? message(GrantsMessage.TooDeep, { maximum: HOPS_MAX }) : undefined;
}

/** Walks grants depth first, in root order then rule order, recording what it finds. */
class Walker {
  readonly #lookup: ContentLookup;
  readonly #facts: PredicateFacts;
  readonly #context: ChoiceContext;
  readonly #present = new Set<ContentId>();
  /** Entries whose slots are recorded. */
  readonly #chosen = new Set<ContentId>();
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
      items: this.#items,
      duplicates: this.#duplicates,
      conditional: this.#conditional,
      open: this.#open,
      answered: this.#answered,
      errors: this.#errors,
    };
  }

  public root({ entry, hop }: GrantRoot): void {
    this.#visit(entry, { hops: [hop], chain: [], flag: undefined, allowDuplicate: false });
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
    const item: GrantedItem = { entry, origin: originOf(entry, visit.hops), flag: visit.flag };
    if (this.#present.has(id) && !visit.allowDuplicate) {
      this.#duplicates.push(item);
      return;
    }
    this.#present.add(id);
    this.#items.push(item);
    this.#follow(entry, visit);
  }

  /** Records `entry`'s choices, then follows each `GrantItem` on it, in rule order. */
  #follow(entry: GrantEntry, visit: Visit): void {
    const at: EntryAt = { entry, hops: visit.hops };
    const choices = this.#choose(at);
    const chain = [...visit.chain, entry];
    for (const [index, element] of entry.rules.entries()) {
      const hop: OriginHop = { kind: OriginHopKind.Grant, by: entry.id, rule: RuleIndex.parse(index) };
      const target = isGrant(element) ? this.#target(at, { element, hop }, choices) : undefined;
      if (isGrant(element) && target !== undefined) {
        const hops = [...visit.hops, ...target.hops, hop];
        const allowDuplicate = element.allowDuplicate === true;
        this.#grant(element, target.id, { hops, chain, flag: element.flag, allowDuplicate });
      }
    }
  }

  /**
   * Reads the entry's choices, and records its slots the first time the entry is followed. A copy granted again
   * with `allowDuplicate` shares its slots (and so its picks), so they are not reported twice.
   */
  #choose(at: EntryAt): EntryChoices {
    const choices = readChoices(at, this.#context);
    if (this.#chosen.has(at.entry.id)) {
      return choices;
    }
    this.#chosen.add(at.entry.id);
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
