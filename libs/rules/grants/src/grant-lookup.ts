import { contentId, ContentId, ContentKind, RollOption, slugName } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentPack, ContentRegistry, PackAncestry, Trait } from '@pioneer/rules/sdk';

import type { ContentLookup, GrantEntry } from './grant-entry';

/**
 * The kinds grants read from the registry's envelope entries (`otherEntries`): those a character picks in a root slot,
 * the class features a class grants by level, feats, which a background or class grants by `GrantItem`, and the
 * items a character carries, which are roots while they are worn, held or invested, and conditions, roots while they
 * last (encumbered, while a character carries too much), and the property runes etched onto those items.
 */
const ENVELOPE_KINDS: ReadonlySet<ContentKind> = new Set([
  ContentKind.AncestryFeature,
  ContentKind.Armor,
  ContentKind.Background,
  ContentKind.Class,
  ContentKind.ClassFeature,
  ContentKind.Condition,
  ContentKind.Consumable,
  ContentKind.Equipment,
  ContentKind.Feat,
  ContentKind.Heritage,
  ContentKind.Rune,
  ContentKind.Shield,
  ContentKind.Treasure,
  ContentKind.Weapon,
]);

/** What `entry` belongs to: a heritage's ancestry; nothing for a versatile heritage or any other kind. */
function belongsTo(entry: ContentEntry): Pick<GrantEntry, 'belongsTo'> {
  const ancestry = entry.kind === ContentKind.Heritage ? entry.data.ancestry : undefined;
  return ancestry === undefined ? {} : { belongsTo: ancestry };
}

/** Whether a condition carries a value; nothing for any other kind. */
function valued(entry: ContentEntry): Pick<GrantEntry, 'valued'> {
  return entry.kind === ContentKind.Condition ? { valued: entry.data.valued } : {};
}

function traitOptions(traits: readonly Trait[]): RollOption[] {
  return traits.map((trait) => RollOption.parse(`trait:${trait}`));
}

/** A class feature's tags, `tag:cleric-doctrine`, which a subclass's `ChoiceSet` filters on; none for another kind. */
function tagOptions(entry: ContentEntry): RollOption[] {
  const tags = entry.kind === ContentKind.ClassFeature ? (entry.data.tags ?? []) : [];
  return tags.map((tag) => RollOption.parse(`tag:${tag}`));
}

/** An ancestry as grants read it, with its rule elements: the ancestry features and feat slots it grants. */
function ancestryEntry(pack: ContentPack, ancestry: PackAncestry): GrantEntry | undefined {
  const [source, ...sources] = ancestry.sources;
  if (source === undefined) {
    return undefined;
  }
  return {
    id: ContentId.parse(contentId(pack.id, ancestry.slug)),
    kind: ContentKind.Ancestry,
    slug: slugName(ancestry.slug),
    name: ancestry.name,
    rules: ancestry.rules ?? [],
    sources: [source, ...sources],
    rollOptions: traitOptions(ancestry.traits),
  };
}

/** A background, class, class feature, feat or heritage, read from its envelope with its rule elements. */
function envelopeEntry(entry: ContentEntry): GrantEntry | undefined {
  const [source, ...sources] = entry.sources;
  if (source === undefined || !ENVELOPE_KINDS.has(entry.kind)) {
    return undefined;
  }
  return {
    id: entry.id,
    kind: entry.kind,
    slug: slugName(entry.slug),
    name: entry.name,
    rules: entry.rules,
    sources: [source, ...sources],
    rollOptions: [...traitOptions(entry.traits), ...tagOptions(entry)],
    ...belongsTo(entry),
    ...valued(entry),
  };
}

function packEntries(pack: ContentPack): GrantEntry[] {
  return [
    ...pack.ancestries.flatMap((each) => ancestryEntry(pack, each) ?? []),
    ...pack.otherEntries.flatMap((each) => envelopeEntry(each) ?? []),
  ];
}

/**
 * The registry's content as grants read it: ancestries, heritages, backgrounds and classes, the kinds a character
 * picks in its root slots, the class features and feats they grant, and carried items. Other kinds join as the
 * registry holds them. Built once per registry; lookups are by id and by kind.
 */
export function grantLookup(registry: ContentRegistry): ContentLookup {
  const entries = registry.packs.flatMap((pack) => packEntries(pack));
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const byKind = Map.groupBy(entries, (entry) => entry.kind);
  return {
    entry: (id: ContentId): GrantEntry | undefined => byId.get(id),
    ofKind: (kind: ContentKind): readonly GrantEntry[] => byKind.get(kind) ?? [],
  };
}
