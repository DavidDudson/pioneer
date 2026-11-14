/**
 * The removal pass over committed packs (ADR-0031): each condition names, in the `others` endings of its `recovery`,
 * the spells, feats, actions and consumables that ease it; this inverts that list onto the easing entries as
 * `removesConditions`, with what each does to the condition (end it, lower it, counteract it). Entries the pass does
 * not change keep their JSON as is.
 */
import {
  ConditionRemoval,
  ConditionRemovalEffect,
  ContentEntry,
  ContentEntryFile,
  contentKey,
  ContentKind,
  SpellRank,
} from '@pioneer/rules/sdk';
import type { ContentId, ContentKey, EntrySlug } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** What an entry does to the conditions it eases, read from its rules text (Player Core and Player Core 2). */
interface Easing {
  readonly effect: ConditionRemovalEffect;
  /** Points a `lower` takes off, where it is not 1. */
  readonly by?: number;
}

const COUNTERACT: Easing = { effect: ConditionRemovalEffect.Counteract };
const REMOVE: Easing = { effect: ConditionRemovalEffect.Remove };
const LOWER: Easing = { effect: ConditionRemovalEffect.Lower };
const LOWER_BY_TWO: Easing = { effect: ConditionRemovalEffect.Lower, by: 2 };

/**
 * How each entry the conditions name eases them, by slug. Counteracting is the rules' own word for it: a spell or an
 * elixir "attempts to counteract" the effect. Word of Freedom suppresses the condition for the spell's duration, so it
 * reads as an ending; Verdant Rest removes the listed conditions with a daily rest.
 */
const EASINGS: ReadonlyMap<string, Easing> = new Map([
  ['spell:sound-body', COUNTERACT],
  ['spell:clear-mind', COUNTERACT],
  ['spell:sure-footing', COUNTERACT],
  ['spell:symphony-of-the-unfettered-heart', COUNTERACT],
  ['spell:word-of-freedom', REMOVE],
  ['spell:veil-of-confidence', LOWER],
  ['feat:treat-condition', COUNTERACT],
  ['feat:invigorating-elixir', COUNTERACT],
  ['feat:supreme-invigorating-elixir', COUNTERACT],
  ['feat:legendary-medic', REMOVE],
  ['feat:inner-strength', LOWER],
  ['feat:shake-it-off', LOWER],
  ['feat:advanced-first-aid', LOWER],
  ['feat:unusual-treatment', LOWER],
  ['feat:dwarven-doughtiness', LOWER_BY_TWO],
  ['action:verdant-rest', REMOVE],
  ...['minor', 'lesser', 'moderate', 'greater', 'major'].flatMap((grade): [string, Easing][] => [
    [`consumable:surging-serum-${grade}`, COUNTERACT],
    [`consumable:bottled-catharsis-${grade}`, COUNTERACT],
  ]),
]);

const RANK_WORDING = /(?<rank>\d{1,2})(?:st|nd|rd|th)-rank counteract/u;

/** The rank a consumable's text counteracts at ("a 1st-rank counteract"), where it says one. */
function writtenRank(entry: ContentEntry): SpellRank | undefined {
  const rank = RANK_WORDING.exec(JSON.stringify(entry.description))?.groups?.['rank'];
  return rank === undefined ? undefined : SpellRank.parse(Number(rank));
}

/** The rank a counteract is attempted at: a spell's own rank, or the one a consumable's text gives. */
function counteractRank(entry: ContentEntry): SpellRank | undefined {
  return entry.kind === ContentKind.Spell ? entry.data.rank : writtenRank(entry);
}

/** What `easing` does to `condition`, as `entry` declares it. */
function removal(entry: ContentEntry, condition: ContentId, easing: Easing): ConditionRemoval {
  const rank = easing.effect === ConditionRemovalEffect.Counteract ? counteractRank(entry) : undefined;
  return ConditionRemoval.parse({
    condition,
    effect: easing.effect,
    ...(easing.by === undefined ? {} : { by: easing.by }),
    ...(rank === undefined ? {} : { rank }),
  });
}

/** The conditions each entry eases and what is left unsaid about them: entries a condition names that have no easing here. */
export interface RemovalMatches {
  readonly removals: ReadonlyMap<ContentKey, readonly ConditionRemoval[]>;
  /** Slugs of entries some condition names as easing it that the table above does not describe. */
  readonly unmapped: readonly EntrySlug[];
}

/** An entry a condition names as easing it. */
interface Named {
  readonly condition: ContentId;
  readonly remover: ContentEntry;
}

/** The ids of the entries `condition` names as easing it; none for any other entry. */
function easingIds(condition: ContentEntry): readonly ContentId[] {
  if (condition.kind !== ContentKind.Condition) {
    return [];
  }
  return condition.data.recovery.flatMap((ending) => (ending.kind === 'others' ? ending.by : []));
}

/** The entries every condition names as easing it, each with the conditions it eases, from the pack entries. */
export function removalMatches(entries: readonly ContentEntry[]): RemovalMatches {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const named = entries.flatMap((condition) =>
    easingIds(condition).flatMap((id): Named[] => {
      const remover = byId.get(id);
      return remover === undefined ? [] : [{ condition: condition.id, remover }];
    }),
  );
  const removals = new Map<ContentKey, ConditionRemoval[]>();
  for (const { condition, remover } of named) {
    const easing = EASINGS.get(remover.slug);
    if (easing !== undefined) {
      const key = contentKey(remover.pack, remover.slug);
      removals.set(key, [...(removals.get(key) ?? []), removal(remover, condition, easing)]);
    }
  }
  const unmapped = named.map(({ remover }) => remover.slug).filter((slug) => !EASINGS.has(slug));
  return { removals, unmapped: [...new Set(unmapped)] };
}

/** `entry` with `removesConditions`; undefined for a kind that has none. */
function withRemovals(entry: ContentEntry, removesConditions: readonly ConditionRemoval[]): ContentEntry | undefined {
  if (entry.kind === ContentKind.Spell) {
    return { ...entry, data: { ...entry.data, removesConditions } };
  }
  if (entry.kind === ContentKind.Feat) {
    return { ...entry, data: { ...entry.data, removesConditions } };
  }
  if (entry.kind === ContentKind.ClassFeature) {
    return { ...entry, data: { ...entry.data, removesConditions } };
  }
  if (entry.kind === ContentKind.Action) {
    return { ...entry, data: { ...entry.data, removesConditions } };
  }
  if (entry.kind === ContentKind.Consumable) {
    return { ...entry, data: { ...entry.data, removesConditions } };
  }
  return undefined;
}

/**
 * A `<kind>.json` file with each matched entry's removals set, or undefined when no entry in it matched. Only matched
 * entries are re-encoded; the rest are the file's own JSON.
 */
export function enrichRemovalFile(
  file: readonly unknown[],
  matches: ReadonlyMap<ContentKey, readonly ConditionRemoval[]>,
): readonly unknown[] | undefined {
  const entries = ContentEntryFile.parse(file);
  const enriched = file.map((json, index) => {
    const entry = entries[index];
    const removals = entry === undefined ? undefined : matches.get(contentKey(entry.pack, entry.slug));
    const changed = entry === undefined || removals === undefined ? undefined : withRemovals(entry, removals);
    return changed === undefined ? json : z.encode(ContentEntry, changed);
  });
  const changed = enriched.some((json, index) => json !== file[index]);
  return changed ? enriched : undefined;
}
