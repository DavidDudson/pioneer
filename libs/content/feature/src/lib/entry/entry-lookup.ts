import type { LinkTarget } from '@pioneer/frontier';
import { ContentId as ContentIdSchema, contentId, ContentKind, ContentKindSchema, slugName } from '@pioneer/rules/sdk';
import type {
  ContentEntry,
  ContentId,
  ContentPack,
  ContentRegistry,
  ContentText,
  PackCreature,
} from '@pioneer/rules/sdk';
import { entryTarget } from '@pioneer/rules/ui';
import type { EntryPreview, EntryPreviews, RichTextLinks } from '@pioneer/rules/ui';

import { BROWSE_KINDS } from '../browser/browse-kinds';

/**
 * The kinds loaded beside the entry's own, so a reference in its text names and links the entry it points at: the
 * kinds the browser lists, and the conditions descriptions mention most.
 */
const REFERENCED_KINDS: readonly ContentKind[] = [...BROWSE_KINDS, ContentKind.Condition];

/** The kinds to load for an entry of `kind`: its own first, then the ones its text may refer to. */
export function entryKinds(kind: ContentKind): readonly ContentKind[] {
  return [kind, ...REFERENCED_KINDS.filter((referenced) => referenced !== kind)];
}

/** The kind a link names, or `undefined` when it is no kind. */
export function kindOfParam(param: string | null | undefined): ContentKind | undefined {
  const parsed = ContentKindSchema.safeParse(param);
  return parsed.success ? parsed.data : undefined;
}

/**
 * A creature of `pack` as the entry it came from. A pack files creatures as flat stat blocks, so the envelope's
 * rarity, rules and description are not in it: the description is the one the entry's shard holds.
 */
function creatureEntry(pack: ContentPack, creature: PackCreature): ContentEntry {
  const { slug, name, sources, traits, level, ...data } = creature;
  return {
    id: ContentIdSchema.parse(contentId(pack.id, slug)),
    pack: pack.id,
    kind: ContentKind.Creature,
    slug,
    name,
    level,
    rarity: 'common',
    traits,
    sources,
    description: [],
    rules: [],
    data,
  };
}

/** Every entry the registry's packs hold, creatures included; a later pack's entry of the same id comes later. */
export function registryEntries(registry: ContentRegistry): readonly ContentEntry[] {
  return registry.packs.flatMap((pack) => [
    ...pack.otherEntries,
    ...pack.creatures.map((creature) => creatureEntry(pack, creature)),
  ]);
}

/** The entry of `kind` named `name` in its slug. A later pack's entry of the same slug wins, as in the registry. */
export function findEntry(registry: ContentRegistry, kind: ContentKind, name: string | null): ContentEntry | undefined {
  return registryEntries(registry).findLast((entry) => entry.kind === kind && slugName(entry.slug) === name);
}

/** What the page shows of `entry`: its card, with `description` as the text when it has loaded. */
export function entryCard(entry: ContentEntry, description: ContentEntry['description'] | undefined): EntryPreview {
  const card: EntryPreview = {
    name: entry.name,
    level: 'level' in entry ? entry.level : undefined,
    traits: entry.traits,
    summary: description ?? entry.description,
    sources: entry.sources,
  };
  return entry.kind === ContentKind.Creature
    ? { ...card, creature: { name: entry.name, level: entry.level, traits: entry.traits, data: entry.data } }
    : card;
}

/** Every entry of the registry by id; a later pack's entry of the same id wins. */
export function entryIndex(registry: ContentRegistry): ReadonlyMap<ContentId, ContentEntry> {
  return new Map(registryEntries(registry).map((entry) => [entry.id, entry]));
}

/** The rich text links of a page over `index`: a reference to an entry it holds is named and linked. */
export function entryLinks(index: () => ReadonlyMap<ContentId, ContentEntry> | undefined): RichTextLinks {
  return {
    name: (id): ContentText | undefined => index()?.get(id)?.name,
    target: (id): LinkTarget | undefined => {
      const entry = index()?.get(id);
      return entry === undefined ? undefined : entryTarget(entry);
    },
    statisticName: (): undefined => undefined,
  };
}

/** The previews of a page over `index`: a hover on an entry it holds shows its card, which links to the entry's page. */
export function entryPreviews(index: () => ReadonlyMap<ContentId, ContentEntry> | undefined): EntryPreviews {
  return {
    preview: (id): EntryPreview | undefined => {
      const entry = index()?.get(id);
      return entry === undefined ? undefined : entryCard(entry, undefined);
    },
    target: (id): LinkTarget | undefined => {
      const entry = index()?.get(id);
      return entry === undefined ? undefined : entryTarget(entry);
    },
  };
}
