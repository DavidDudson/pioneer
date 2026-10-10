import * as z from 'zod';

import { ContentEntry } from './content-entry';
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
 * The `ContentPack` a pack's JSON files describe: `pack.json` and the entries of every `<kind>.json`. Until the
 * registry serves entries directly (Epic 2.3), entries become the definitions it holds today. An entry filed under
 * another pack is an error naming it.
 */
export function contentPackFromFiles(packFile: unknown, entryFiles: readonly unknown[]): ContentPack {
  const { proficiencyBonus, rollOptionNamespaces, ...manifest } = ContentPackFile.parse(packFile);
  const definitions: PackDefinitions = {
    ancestries: [],
    creatures: [],
    statistics: [],
    variantRules: [],
    otherEntries: [],
  };
  for (const file of entryFiles) {
    for (const entry of ContentEntryFile.parse(file)) {
      if (entry.pack !== manifest.id) {
        throw new Error(`Entry "${entry.pack}/${entry.slug}" is filed under pack "${manifest.id}"`);
      }
      addDefinition(definitions, entry);
    }
  }
  return ContentPack.define({ manifest, proficiencyBonus, rollOptionNamespaces, ...definitions });
}
