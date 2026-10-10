import { PredicateFacts, withKnown } from '@pioneer/rules/predicate';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentText, Level, OriginHop, RollOption } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { characterFacts, levelOptions } from './character-facts';
import type { CharacterFacts, FactState } from './character-facts';
import type { AnsweredSlot, ChoicePicks, ChoiceSlot } from './choices';
import type { ContentLookup, GrantError, GrantRoot } from './grant-entry';
import { walkGrants } from './grant-walk';
import type { ConditionalGrant, GrantedItem } from './grant-walk';
import { GrantsMessage } from './messages';
import { byCodeUnit } from './order';
import { RoundLog } from './round-log';
import type { Round } from './round-log';
import type { ToggleSlot, ToggleStates } from './toggles';

export interface GrantInputs {
  readonly roots: readonly GrantRoot[];
  readonly lookup: ContentLookup;
  /** The character's level, read as `self:level:<level>`. */
  readonly level: Level;
  /** What the caller knows of the moment (`terrain:forest`), on top of what the character's entries set. */
  readonly situation: readonly RollOption[];
  readonly picks: ChoicePicks;
  readonly toggles: ToggleStates;
  /** Which namespaces are known: the registry's merged table (`ContentRegistry.rollOptionNamespaces`). */
  readonly namespaces: NamespaceTable;
}

/**
 * Pipeline steps 1 and 2 (rules-engine.md), ready for step 3: every entry in play with its origin, the grants
 * skipped because the entry was already there, the grants that depend on the situation, the choices made and still
 * to make, the toggles, the facts the set derives, and what failed.
 */
export interface GrantResolution {
  readonly items: readonly GrantedItem[];
  /** Grants of an entry already on the character, without `allowDuplicate`. */
  readonly duplicates: readonly GrantedItem[];
  readonly conditional: readonly ConditionalGrant[];
  /** Choices the player has yet to make, or whose pick is not on offer. */
  readonly open: readonly ChoiceSlot[];
  readonly answered: readonly AnsweredSlot[];
  readonly toggles: readonly ToggleSlot[];
  /**
   * What the set says of the character, sorted: its level, the option each entry's kind sets (`feat:shield-block`),
   * its `RollOption` elements and the toggles that are on, and its picks' `rollOption`s.
   */
  readonly rollOptions: readonly RollOption[];
  /** `rollOptions` and the situation, with the namespaces the picks write known: what every predicate read last. */
  readonly facts: PredicateFacts;
  readonly errors: readonly GrantError[];
}

/**
 * Most walks before giving up. Each round of a set that only grows adds an entry or an option, and real content
 * settles in a handful, so reaching this means a chain of dependencies no character has.
 */
const ROUNDS_MAX = 32;
/** When rounds run out, the last two are compared to name what was still changing. */
const LAST_ROUNDS = 2;
const LIST_SEPARATOR = ', ';
const STATE_SEPARATOR = '|';
const WORD_SEPARATOR = ' ';

/** Builds the error for rounds that never settle, from the entries involved. */
type UnsettledError = (entries: string, count: number) => MessageDescriptor;

/** Names one state of the facts, so a repeat is found by lookup. */
function fingerprintOf({ options, known }: FactState): string {
  return [options.join(WORD_SEPARATOR), known.join(WORD_SEPARATOR)].join(STATE_SEPARATOR);
}

/** The values found in every list, in the first list's order. */
function common<Value>(lists: readonly (readonly Value[])[]): Value[] {
  const [first = [], ...rest] = lists;
  const others = rest.map((list) => new Set(list));
  return first.filter((value) => others.every((other) => other.has(value)));
}

/** The entries that set an option outside `kept`. */
function settersOutside(derived: CharacterFacts, kept: ReadonlySet<RollOption>): ContentId[] {
  return [...derived.setBy].flatMap(([option, setBy]) => (kept.has(option) ? [] : setBy));
}

/** A round whose set derives the facts it read: the resolution. */
function settled({ walk, facts, derived }: Round): GrantResolution {
  return { ...walk, toggles: derived.toggles, rollOptions: derived.options, facts };
}

/** What `round` has that comes from entries in `core` alone. */
type Kept = Omit<GrantResolution, 'rollOptions' | 'facts'>;

/** The parts of `round` every entry behind which is in `core`. */
function keptOf({ walk, derived }: Round, core: ReadonlySet<ContentId>): Kept {
  const inCore = (hops: readonly OriginHop[]): boolean =>
    hops.every((hop) => hop.kind !== OriginHopKind.Grant || core.has(hop.by));
  return {
    items: walk.items.filter((item) => core.has(item.entry.id)),
    duplicates: walk.duplicates.filter((item) => inCore(item.origin.hops)),
    conditional: walk.conditional.filter((grant) => inCore(grant.origin.hops)),
    open: walk.open.filter((slot) => core.has(slot.origin.entry)),
    answered: walk.answered.filter((slot) => core.has(slot.origin.entry)),
    toggles: derived.toggles.filter((toggle) => core.has(toggle.origin.entry)),
    errors: walk.errors.filter((each) => inCore(each.hops)),
  };
}

/**
 * The entries in `rounds` that some round lacks, or that set an option some round lacks, by name. A loop always has
 * at least one, since its rounds differ in an entry or in an option an entry set.
 */
function involvedNames(
  rounds: readonly Round[],
  core: ReadonlySet<ContentId>,
  kept: ReadonlySet<RollOption>,
): string[] {
  const names = new Map<ContentId, ContentText>();
  const involved = new Set<ContentId>();
  for (const { walk, derived } of rounds) {
    for (const { entry } of walk.items) {
      names.set(entry.id, entry.name);
    }
    const coming = walk.items.map((item) => item.entry.id).filter((id) => !core.has(id));
    for (const id of [...coming, ...settersOutside(derived, kept)]) {
      involved.add(id);
    }
  }
  return [...involved].flatMap((id) => names.get(id) ?? []).toSorted(byCodeUnit);
}

/** Resolves rounds of grants until the facts they derive stop changing. */
class Fixpoint {
  readonly #inputs: GrantInputs;

  public constructor(inputs: GrantInputs) {
    this.#inputs = inputs;
  }

  public resolve(): GrantResolution {
    return this.#settle({ options: levelOptions(this.#inputs.level), known: [] }, new RoundLog());
  }

  /** Walks against `state`; done once the set derives `state` again, else walks against what it derives. */
  #settle(state: FactState, log: RoundLog): GrantResolution {
    const fingerprint = fingerprintOf(state);
    const round = this.#round(state);
    log.add(fingerprint, round);
    const next = fingerprintOf(round.derived);
    if (next === fingerprint) {
      return settled(round);
    }
    const loop = log.since(next);
    if (loop !== undefined) {
      return this.#unsettled(round, loop, (entries, count) => message(GrantsMessage.Oscillates, { entries, count }));
    }
    if (log.size === ROUNDS_MAX) {
      return this.#unsettled(round, log.latest(LAST_ROUNDS), (entries, count) =>
        message(GrantsMessage.TooManyRounds, { entries, count, maximum: ROUNDS_MAX }),
      );
    }
    return this.#settle(round.derived, log);
  }

  /** Walks the grants against `state` and the situation, and derives the facts the set it reaches has. */
  #round(state: FactState): Round {
    const facts = this.#factsOf(state);
    const walk = walkGrants({ ...this.#inputs, facts });
    const derived = characterFacts(walk, { level: this.#inputs.level, facts, toggles: this.#inputs.toggles });
    return { walk, facts, derived };
  }

  #factsOf({ options, known }: FactState): PredicateFacts {
    return new PredicateFacts([...options, ...this.#inputs.situation], withKnown(this.#inputs.namespaces, known));
  }

  /**
   * Rounds that never settle: only what every one of them agrees on stays, taken from `last`. The entries that come
   * and go, or that set options that come and go, are named in an error.
   */
  #unsettled(last: Round, rounds: readonly Round[], error: UnsettledError): GrantResolution {
    const core = new Set(common(rounds.map(({ walk }) => walk.items.map((item) => item.entry.id))));
    const options = common(rounds.map(({ derived }) => derived.options));
    const known = common(rounds.map(({ derived }) => derived.known));
    const names = involvedNames(rounds, core, new Set(options));
    const failed: GrantError = { error: error(names.join(LIST_SEPARATOR), names.length), hops: [] };
    const kept = keptOf(last, core);
    return {
      ...kept,
      rollOptions: options,
      facts: this.#factsOf({ options, known }),
      errors: [...kept.errors, failed],
    };
  }
}

/**
 * Resolves `GrantItem` and `ChoiceSet` elements from the character's roots down (see `walkGrants`), against facts
 * derived from the set itself. Each round walks the grants against the level, the situation and the facts the last
 * round's set derived (`characterFacts`), and derives them again; once they stop changing, the set is settled. Facts
 * are rebuilt from scratch each round, so an entry whose predicate stops holding drops out with what it set.
 *
 * Rounds that return to facts seen before never settle: a grant negated by what it grants. Only the entries every
 * such round has stay, and an error names the rest. Rounds are bounded, so resolution always ends.
 */
export function resolveGrants(inputs: GrantInputs): GrantResolution {
  return new Fixpoint(inputs).resolve();
}
