import * as z from 'zod';

import { ContentEntry } from './content-entry';
import type { PackId, Slug } from './content-id';
import { ContentKind } from './content-kind';
import { ContentPack, ContentPackManifest } from './content-pack';
import type { PackAncestry, PackCreature, PackStatistic } from './content-pack';
import { ProficiencyBonusTable } from './proficiency';
import { RollOptionNamespaces } from './roll-option-namespace';
import type { VariantRuleDefinition } from './variant-rule';

/**
 * A pack's `pack.json` under `content/packs/<pack>/`: its manifest, plus the pack-wide data no entry holds. The core
 * rules pack's proficiency bonus table (ADR-0026) and roll option namespace table live here.
 */
export const ContentPackFile = z.strictObject({
  ...ContentPackManifest.shape,
  proficiencyBonus: ProficiencyBonusTable.optional(),
  rollOptionNamespaces: RollOptionNamespaces.optional(),
});
export type ContentPackFile = z.infer<typeof ContentPackFile>;

/** One `<kind>.json` file of a pack: its entries, each checked as a `ContentEntry`. */
export const ContentEntryFile = z.array(ContentEntry).readonly();

interface PackDefinitions {
  readonly ancestries: PackAncestry[];
  readonly creatures: PackCreature[];
  readonly statistics: PackStatistic[];
  readonly variantRules: VariantRuleDefinition[];
  readonly otherEntries: ContentEntry[];
}

/** Files an entry as a definition `ContentRegistry` serves, or with the kinds it doesn't serve yet. */
function addDefinition(definitions: PackDefinitions, entry: ContentEntry): void {
  const { slug, name, sources } = entry;
  if (entry.kind === ContentKind.Ancestry) {
    definitions.ancestries.push({ slug, name, sources, traits: entry.traits, ...entry.data });
  } else if (entry.kind === ContentKind.Creature) {
    definitions.creatures.push({ slug, name, sources, traits: entry.traits, level: entry.level, ...entry.data });
  } else if (entry.kind === ContentKind.Statistic) {
    definitions.statistics.push({ slug, name, sources, ...entry.data });
  } else if (entry.kind === ContentKind.VariantRule) {
    definitions.variantRules.push({ slug, name, sources: [...sources], rules: [...entry.rules] });
  } else {
    definitions.otherEntries.push(entry);
  }
}

/**
 * Throws unless `entry` belongs in `pack` under a slug no earlier entry took. The id is UUIDv5 of `<pack>/<slug>`
 * whatever the kind, so a `goblin` language beside a `goblin` ancestry would share its id.
 */
function checkPlacement(pack: PackId, entry: ContentEntry, taken: Set<Slug>): void {
  if (entry.pack !== pack) {
    throw new Error(`Entry "${entry.pack}/${entry.slug}" is filed under pack "${pack}"`);
  }
  if (taken.has(entry.slug)) {
    throw new Error(`Slug "${entry.slug}" is used twice in pack "${pack}"`);
  }
  taken.add(entry.slug);
}

/** A pack's JSON files once checked: its `pack.json`, and the entries of its `<kind>.json` files in file order. */
export interface PackContents {
  readonly file: ContentPackFile;
  readonly entries: readonly ContentEntry[];
}

/** How the API reads a pack's files without bundling them up front: a lazy dynamic import, like `ContentPackLoader`. */
export interface PackContentsLoader {
  readonly id: PackId;
  readonly load: () => Promise<PackContents>;
}

/**
 * Checks a pack's JSON files: `pack.json` and the entries of every `<kind>.json`. An entry filed under another pack,
 * or a slug used twice across the pack's kinds, is an error naming it.
 */
export function packContentsFromFiles(packFile: unknown, entryFiles: readonly unknown[]): PackContents {
  const file = ContentPackFile.parse(packFile);
  const entries = entryFiles.flatMap((entryFile) => ContentEntryFile.parse(entryFile));
  const taken = new Set<Slug>();
  for (const entry of entries) {
    checkPlacement(file.id, entry, taken);
  }
  return { file, entries };
}

/**
 * The `ContentPack` a pack's checked files describe. Until the registry serves entries directly (Epic 2.3), entries
 * become the definitions it holds today.
 */
export function contentPackFromContents({ file, entries }: PackContents): ContentPack {
  const { proficiencyBonus, rollOptionNamespaces, ...manifest } = file;
  const definitions: PackDefinitions = {
    ancestries: [],
    creatures: [],
    statistics: [],
    variantRules: [],
    otherEntries: [],
  };
  for (const entry of entries) {
    addDefinition(definitions, entry);
  }
  return ContentPack.define({ manifest, proficiencyBonus, rollOptionNamespaces, ...definitions });
}

/** The `ContentPack` a pack's JSON files describe: `packContentsFromFiles`, then `contentPackFromContents`. */
export function contentPackFromFiles(packFile: unknown, entryFiles: readonly unknown[]): ContentPack {
  return contentPackFromContents(packContentsFromFiles(packFile, entryFiles));
}
