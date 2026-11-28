/**
 * The pure part of `--creatures` (ADR-0031, ADR-0077): a legacy book's `npc` actors join a pack that is already
 * committed, as `creature` entries, and the backlog keeps what they could not translate. Nothing else in the pack or
 * its backlog changes.
 */
import { BacklogItemType } from '@pioneer/interop/foundry';
import type { BacklogItem } from '@pioneer/interop/foundry';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, PackId } from '@pioneer/rules/sdk';

/** The prefix a creature's backlog slug has: `<kind>:<slug>`. */
const CREATURE_SLUG_PREFIX = `${ContentKind.Creature}:`;

/** The kind file the creatures go in. */
export const CREATURE_FILE = `${ContentKind.Creature}.json`;

/** The creatures of `pack` among `entries`. */
export function creaturesOf(entries: ReadonlyArray<ContentEntry>, pack: PackId): ReadonlyArray<ContentEntry> {
  return entries.filter((entry) => entry.pack === pack && entry.kind === ContentKind.Creature);
}

/** The committed creatures with the new ones, sorted by slug, and how many were new. */
export interface CreatureMerge {
  readonly entries: ReadonlyArray<ContentEntry>;
  readonly added: number;
}

/** The slugs of `entries`. */
export function slugsOf(entries: ReadonlyArray<{ readonly slug: string }>): ReadonlySet<string> {
  return new Set(entries.map(({ slug }) => slug));
}

function bySlug(left: { readonly slug: string }, right: { readonly slug: string }): number {
  return left.slug.localeCompare(right.slug);
}

/** `committed` with the creatures of `fresh` it does not hold by slug; a committed creature is kept as it is. */
export function mergeCreatures(
  committed: ReadonlyArray<ContentEntry>,
  fresh: ReadonlyArray<ContentEntry>,
): CreatureMerge {
  const have = slugsOf(committed);
  const added = fresh.filter(({ slug }) => !have.has(slug));

  return { entries: [...committed, ...added].toSorted(bySlug), added: added.length };
}

/** The creature slug (`creature:<name>`, as the entry has it) a backlog item is about; nothing for another kind or pack. */
function creatureSlug(item: BacklogItem, pack: PackId): string | undefined {
  const isCreature =
    item.type === BacklogItemType.Entry && item.pack === pack && item.slug.startsWith(CREATURE_SLUG_PREFIX);

  return isCreature ? item.slug : undefined;
}

/**
 * `backlog` with the creature items of `fresh` added for every creature of `pack` not already `committed` (by slug),
 * left out ones included. A committed creature keeps whatever backlog it has.
 */
export function withCreatureBacklog(
  backlog: ReadonlyArray<BacklogItem>,
  fresh: ReadonlyArray<BacklogItem>,
  { pack, committed }: { readonly pack: PackId; readonly committed: ReadonlySet<string> },
): ReadonlyArray<BacklogItem> {
  const incoming = fresh.filter((item) => {
    const slug = creatureSlug(item, pack);

    return slug !== undefined && !committed.has(slug);
  });

  const replaced = new Set(incoming.map((item) => creatureSlug(item, pack)));

  return [...backlog.filter((item) => !replaced.has(creatureSlug(item, pack))), ...incoming];
}
