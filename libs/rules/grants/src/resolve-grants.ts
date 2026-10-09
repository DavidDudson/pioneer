import { evaluatePredicate, summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts, PredicateSummary } from '@pioneer/rules/predicate';
import { ContentId, OriginHopKind, RuleElementKey, RuleIndex } from '@pioneer/rules/sdk';
import type { GrantItemElement, Origin, OriginHop, Predicate, RuleElement, RuleSlug } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { ContentLookup, GrantEntry, GrantRoot } from './grant-entry';
import { GrantsMessage } from './messages';

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

/** A grant that failed, and the hops down to the element that made it (or the root, for a root that failed). */
export interface GrantError {
  readonly error: MessageDescriptor;
  readonly hops: readonly OriginHop[];
}

/**
 * Pipeline steps 1 and 2 (rules-engine.md): every entry in play with its origin, the grants skipped because the
 * entry was already there, the grants that depend on the situation, and what failed.
 */
export interface GrantResolution {
  readonly items: readonly GrantedItem[];
  /** Grants of an entry already on the character, without `allowDuplicate`. */
  readonly duplicates: readonly GrantedItem[];
  readonly conditional: readonly ConditionalGrant[];
  readonly errors: readonly GrantError[];
}

export interface GrantInputs {
  readonly roots: readonly GrantRoot[];
  readonly lookup: ContentLookup;
  readonly facts: PredicateFacts;
}

/** Longest chain followed; matches the most hops an `Origin` records. */
const HOPS_MAX = 64;
const LIST_SEPARATOR = ', ';

/** A `GrantItem` that names its entry outright, rather than through a choice. */
interface FixedGrant extends GrantItemElement {
  readonly item: ContentId;
}

function isFixedGrant(element: RuleElement): element is FixedGrant {
  return element.key === RuleElementKey.GrantItem && ContentId.safeParse(element.item).success;
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
  return left.entry.localeCompare(right.entry) || JSON.stringify(left.hop).localeCompare(JSON.stringify(right.hop));
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
class GrantWalk {
  readonly #lookup: ContentLookup;
  readonly #facts: PredicateFacts;
  readonly #present = new Set<ContentId>();
  readonly #items: GrantedItem[] = [];
  readonly #duplicates: GrantedItem[] = [];
  readonly #conditional: ConditionalGrant[] = [];
  readonly #errors: GrantError[] = [];

  public constructor(lookup: ContentLookup, facts: PredicateFacts) {
    this.#lookup = lookup;
    this.#facts = facts;
  }

  public get resolution(): GrantResolution {
    return { items: this.#items, duplicates: this.#duplicates, conditional: this.#conditional, errors: this.#errors };
  }

  public root({ entry, hop }: GrantRoot): void {
    this.#visit(entry, { hops: [hop], chain: [], flag: undefined, allowDuplicate: false });
  }

  #find(id: ContentId, hops: readonly OriginHop[]): GrantEntry | undefined {
    const entry = this.#lookup(id);
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

  /** Each fixed `GrantItem` on `entry`, in rule order. */
  #follow(entry: GrantEntry, visit: Visit): void {
    const chain = [...visit.chain, entry];
    for (const [index, element] of entry.rules.entries()) {
      if (isFixedGrant(element)) {
        const hop: OriginHop = { kind: OriginHopKind.Grant, by: entry.id, rule: RuleIndex.parse(index) };
        const hops = [...visit.hops, hop];
        this.#grant(element, { hops, chain, flag: element.flag, allowDuplicate: element.allowDuplicate === true });
      }
    }
  }

  /** Follows a grant whose predicate holds; records one that depends on the situation; drops one that fails. */
  #grant(element: FixedGrant, visit: Visit): void {
    const { predicate } = element;
    const truth = predicate === undefined ? Truth.True : evaluatePredicate(predicate, this.#facts);
    if (truth === Truth.True) {
      this.#visit(element.item, visit);
      return;
    }
    if (truth === Truth.False || predicate === undefined) {
      return;
    }
    const summary = summarisePredicate(predicate, this.#facts, element.display?.summary);
    const entry = this.#find(element.item, visit.hops);
    if (entry !== undefined && summary !== undefined) {
      this.#conditional.push({ entry, origin: originOf(entry, visit.hops), predicate, summary });
    }
  }
}

/**
 * Resolves `GrantItem` elements from the character's roots down, depth first. Roots are taken in entry id order,
 * so the result does not depend on the order they are given in. An entry already on the character is a duplicate
 * unless its grant allows one. A grant back to an entry above it is a cycle, reported once and not followed. A
 * missing entry is an error at its grant; the other grants still resolve. Grants through a `ChoiceSet` pick
 * (`{ choice }`) wait for the character's picks and are not followed here.
 */
export function resolveGrants({ roots, lookup, facts }: GrantInputs): GrantResolution {
  const walk = new GrantWalk(lookup, facts);
  for (const root of roots.toSorted(byEntry)) {
    walk.root(root);
  }
  return walk.resolution;
}
