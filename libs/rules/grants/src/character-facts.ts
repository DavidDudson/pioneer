import { RollOptionNamespace } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentKind, OriginHopKind, RuleElementKey } from '@pioneer/rules/sdk';
import type { ConditionValue, ContentId, Level, RollOption } from '@pioneer/rules/sdk';

import type { AnsweredSlot } from './choices';
import type { GrantEntry } from './grant-entry';
import type { GrantWalk } from './grant-walk';
import { optionOf } from './option-of';
import { byCodeUnit } from './order';
import { entryOptions } from './toggles';
import type { PlacedEntry, ToggleSlot, ToggleStates } from './toggles';

/** Where the level is written: `self:level:5`. */
const LEVEL_PREFIX = 'self:level';

/**
 * Where each kind of entry says it is on the character, as Foundry pf2e writes it: `class:fighter`,
 * `feature:shield-block`, `self:condition:grabbed`, `deity:primary:pharasma`. Kinds that never sit on a character
 * (creatures, statistics and the rules core kinds other than conditions) set nothing, and neither does an archetype,
 * which Foundry keeps as a journal page; its feats set `feat:<slug>`. Spells and rituals set nothing by being known:
 * their options belong to a casting.
 */
const KIND_NAMESPACES: Readonly<Record<ContentKind, RollOptionNamespace | undefined>> = {
  [ContentKind.Action]: undefined,
  [ContentKind.Ancestry]: RollOptionNamespace.parse('ancestry'),
  [ContentKind.Archetype]: undefined,
  [ContentKind.Background]: RollOptionNamespace.parse('background'),
  [ContentKind.Class]: RollOptionNamespace.parse('class'),
  [ContentKind.ClassFeature]: RollOptionNamespace.parse('feature'),
  [ContentKind.Condition]: RollOptionNamespace.parse('self:condition'),
  [ContentKind.Creature]: undefined,
  [ContentKind.DamageType]: undefined,
  [ContentKind.Deity]: RollOptionNamespace.parse('deity:primary'),
  [ContentKind.Effect]: RollOptionNamespace.parse('self:effect'),
  [ContentKind.Feat]: RollOptionNamespace.parse('feat'),
  [ContentKind.Heritage]: RollOptionNamespace.parse('heritage'),
  [ContentKind.Language]: undefined,
  [ContentKind.Ritual]: undefined,
  [ContentKind.Sense]: undefined,
  [ContentKind.Spell]: undefined,
  [ContentKind.SpellcastingTradition]: undefined,
  [ContentKind.Statistic]: undefined,
  [ContentKind.Trait]: undefined,
  [ContentKind.VariantRule]: undefined,
};

/** What the facts of one round are built from, apart from the situation. */
export interface FactState {
  /** Sorted, each once. */
  readonly options: readonly RollOption[];
  /** The namespaces the character's `ChoiceSet`s write their picks to, known rather than situational. Sorted. */
  readonly known: readonly RollOptionNamespace[];
}

/** What one walk's set says of the character, and who said it. */
export interface CharacterFacts extends FactState {
  /** The entries that set each option; none for the level. */
  readonly setBy: ReadonlyMap<RollOption, readonly ContentId[]>;
  readonly toggles: readonly ToggleSlot[];
}

/** What deriving a round's facts reads besides the walk. */
export interface FactSources {
  readonly level: Level;
  /** The facts the walk was tested against, for `RollOption` predicates. */
  readonly facts: PredicateFacts;
  readonly toggles: ToggleStates;
}

/** `self:level:<level>`. A negative level (a creature's) cannot be written as a roll option, so it sets none. */
export function levelOptions(level: Level): RollOption[] {
  const option = optionOf(LEVEL_PREFIX, String(level));
  return option === undefined ? [] : [option];
}

/** The option `entry`'s kind sets for it, `feat:<slug>`; none for a kind that sets none. */
function kindOptions(entry: GrantEntry): RollOption[] {
  const namespace = KIND_NAMESPACES[entry.kind];
  const option = namespace === undefined ? undefined : optionOf(namespace, entry.slug);
  return option === undefined ? [] : [option];
}

/**
 * The value the hop that put `entry` on the character gives it: _frightened 2_ from a condition root. A condition
 * granted by another entry has none, as grants carry no value yet.
 */
function conditionValue({ entry, origin }: PlacedEntry): ConditionValue | undefined {
  const hop = origin.hops.at(-1);
  const isCondition = entry.kind === ContentKind.Condition;
  return isCondition && hop?.kind === OriginHopKind.Condition && hop.condition === entry.id ? hop.value : undefined;
}

/** A valued condition on the character, at the highest value it arrived with. */
interface Valued {
  readonly entry: GrantEntry;
  readonly value: ConditionValue;
}

/** The namespaces `entry`'s `ChoiceSet`s write their picks to. */
function pickNamespaces(entry: GrantEntry): RollOptionNamespace[] {
  return entry.rules.flatMap((element): RollOptionNamespace[] =>
    element.key === RuleElementKey.ChoiceSet && element.rollOption !== undefined
      ? [RollOptionNamespace.parse(element.rollOption)]
      : [],
  );
}

/** Records that `by` (none for the level) sets `option`. */
function tally(setBy: Map<RollOption, ContentId[]>, option: RollOption, by: ContentId | undefined): void {
  const setters = setBy.get(option) ?? [];
  if (by !== undefined && !setters.includes(by)) {
    setters.push(by);
  }
  setBy.set(option, setters);
}

/** Gathers what the entries on the character say of it, each entry once. */
class FactCollector {
  readonly #sources: FactSources;
  readonly #setBy = new Map<RollOption, ContentId[]>();
  readonly #seen = new Set<ContentId>();
  readonly #known = new Set<RollOptionNamespace>();
  readonly #toggles: ToggleSlot[] = [];
  readonly #valued = new Map<RollOption, Valued>();

  public constructor(sources: FactSources) {
    this.#sources = sources;
    for (const option of levelOptions(sources.level)) {
      tally(this.#setBy, option, undefined);
    }
  }

  public get facts(): CharacterFacts {
    const known = [...this.#known].toSorted(byCodeUnit);
    const options = [...this.#setBy.keys()].toSorted(byCodeUnit);
    return { options, known, setBy: this.#setBy, toggles: this.#toggles };
  }

  /** The option the entry's kind sets, what its `RollOption` elements set, and the namespaces its picks write. */
  public item(item: PlacedEntry): void {
    const { entry } = item;
    if (this.#seen.has(entry.id)) {
      return;
    }
    this.#seen.add(entry.id);
    const set = entryOptions(item, this.#sources.facts, this.#sources.toggles);
    for (const option of [...kindOptions(entry), ...set.options]) {
      tally(this.#setBy, option, entry.id);
    }
    this.#toggles.push(...set.toggles);
    for (const namespace of pickNamespaces(entry)) {
      this.#known.add(namespace);
    }
  }

  public answered({ option, origin }: AnsweredSlot): void {
    if (option !== undefined) {
      tally(this.#setBy, option, origin.entry);
    }
  }

  /**
   * Keeps the value `item` arrived with when it is a valued condition, and the highest yet; duplicates count. Kept by
   * the condition's option, so conditions of the same slug from different packs share one value.
   */
  public value(item: PlacedEntry): void {
    const value = conditionValue(item);
    const [kind] = kindOptions(item.entry);
    const highest = kind === undefined ? undefined : this.#valued.get(kind);
    if (kind !== undefined && value !== undefined && (highest === undefined || value > highest.value)) {
      this.#valued.set(kind, { entry: item.entry, value });
    }
  }

  /** `self:condition:<slug>:<value>` for each valued condition, at its highest value only. */
  public valued(): void {
    for (const [kind, { entry, value }] of this.#valued) {
      const option = optionOf(kind, String(value));
      if (option !== undefined) {
        tally(this.#setBy, option, entry.id);
      }
    }
  }
}

/**
 * The roll options the character has once `walk`'s set is on it: its level, the option each entry's kind sets, the
 * options its `RollOption` elements set (toggles while on) and its picks' `rollOption`s; and the namespaces those
 * picks write, as known. A copy granted with `allowDuplicate` adds nothing new.
 *
 * A condition put on with a value (_frightened 2_) also sets `self:condition:<slug>:<value>`. One that arrives twice
 * keeps its highest value alone, as comparisons hold if any value does.
 */
export function characterFacts(walk: GrantWalk, sources: FactSources): CharacterFacts {
  const collector = new FactCollector(sources);
  for (const item of walk.items) {
    collector.item(item);
    collector.value(item);
  }
  for (const duplicate of walk.duplicates) {
    collector.value(duplicate);
  }
  collector.valued();
  for (const slot of walk.answered) {
    collector.answered(slot);
  }
  return collector.facts;
}
