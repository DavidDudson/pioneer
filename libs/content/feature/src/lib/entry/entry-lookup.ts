import type { LinkTarget } from '@pioneer/frontier';
import { ContentKind, ContentKindSchema, slugName } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, ContentText } from '@pioneer/rules/sdk';
import type { EntryPreview, RichTextLinks } from '@pioneer/rules/ui';

import { BROWSE_KINDS } from '../browser/browse-kinds';

/** The root of the content browser's routes in the app. */
const CONTENT_PATH = '/content';

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
export function kindOfParam(param: string | null): ContentKind | undefined {
  const parsed = ContentKindSchema.safeParse(param);
  return parsed.success ? parsed.data : undefined;
}

/** Where `entry` opens: `/content/feat/power-attack`. */
export function entryTarget(entry: ContentEntry): LinkTarget {
  return [CONTENT_PATH, entry.kind, slugName(entry.slug)];
}

/** The entry of `kind` named `name` in its slug. A later pack's entry of the same slug wins, as in the registry. */
export function findEntry(registry: ContentRegistry, kind: ContentKind, name: string | null): ContentEntry | undefined {
  return registry.packs
    .flatMap((pack) => pack.otherEntries)
    .findLast((entry) => entry.kind === kind && slugName(entry.slug) === name);
}

/** What the page shows of `entry`: its card, with `description` as the text when it has loaded. */
export function entryCard(entry: ContentEntry, description: ContentEntry['description'] | undefined): EntryPreview {
  return {
    name: entry.name,
    level: 'level' in entry ? entry.level : undefined,
    traits: entry.traits,
    summary: description ?? entry.description,
    sources: entry.sources,
  };
}

/** Every entry of the registry by id; a later pack's entry of the same id wins. */
export function entryIndex(registry: ContentRegistry): ReadonlyMap<ContentId, ContentEntry> {
  return new Map(registry.packs.flatMap((pack) => pack.otherEntries).map((entry) => [entry.id, entry]));
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
