import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AncestryDefinition } from './ancestry';
import { PackId } from './content-id';
import type { Slug } from './content-id';
import { ContentText } from './content-text';
import { CreatureDefinition } from './creature';
import { ContentLicenseSchema } from './license';
import { RulesMessage } from './messages';
import { ProficiencyBonusTable } from './proficiency';
import type { Selector } from './selector';
import { StatisticDefinition } from './statistic';
import { VariantRuleDefinition } from './variant-rule';

export const ContentPackManifest = z.object({
  /** Prefix of every content key in the pack, e.g. `player-core`. */
  id: PackId,
  title: ContentText,
  publisher: ContentText,
  license: ContentLicenseSchema,
});
export type ContentPackManifest = z.infer<typeof ContentPackManifest>;

function uniqueSlugs(entries: readonly { readonly slug: Slug }[]): boolean {
  return new Set(entries.map((entry) => entry.slug)).size === entries.length;
}

/** A pack's statistics: modifiers and references find a statistic by selector, so each selector is used once. */
const Statistics = z
  .array(StatisticDefinition)
  .readonly()
  .refine(uniqueSlugs, 'Duplicate statistic slug')
  .check((context) => {
    const seen = new Set<Selector>();
    for (const [index, { selector }] of context.value.entries()) {
      if (seen.has(selector)) {
        const { params } = issueParams(message(RulesMessage.DuplicateSelector, { selector }));
        context.issues.push({ code: 'custom', input: selector, path: [index, 'selector'], params });
      }
      seen.add(selector);
    }
  });

export const ContentPackSchema = z.object({
  manifest: ContentPackManifest,
  ancestries: z.array(AncestryDefinition).readonly().refine(uniqueSlugs, 'Duplicate ancestry slug'),
  creatures: z.array(CreatureDefinition).readonly().refine(uniqueSlugs, 'Duplicate creature slug'),
  /** Optional, so packs without statistics need not list them. */
  statistics: Statistics.default([]),
  /** How proficiency ranks become bonuses: the core rules pack defines it, and a pack registered later may restate it. */
  proficiencyBonus: ProficiencyBonusTable.optional(),
  variantRules: z
    .array(VariantRuleDefinition)
    .readonly()
    .refine(uniqueSlugs, 'Duplicate variant rule slug')
    .default([]),
});

/**
 * A book (or homebrew set) of rules content. Packs live in their own lazily
 * loaded libraries under `libs/content/*`, depend only on this SDK, and export
 * one pack built with `ContentPack.define`, which validates it eagerly.
 */
export class ContentPack {
  public readonly manifest: ContentPackManifest;
  public readonly ancestries: readonly AncestryDefinition[];
  public readonly creatures: readonly CreatureDefinition[];
  public readonly statistics: readonly StatisticDefinition[];
  public readonly proficiencyBonus: ProficiencyBonusTable | undefined;
  public readonly variantRules: readonly VariantRuleDefinition[];

  private constructor(data: z.output<typeof ContentPackSchema>) {
    this.manifest = data.manifest;
    this.ancestries = data.ancestries;
    this.creatures = data.creatures;
    this.statistics = data.statistics;
    this.proficiencyBonus = data.proficiencyBonus;
    this.variantRules = data.variantRules;
  }

  public static define(data: z.input<typeof ContentPackSchema>): ContentPack {
    return new ContentPack(ContentPackSchema.parse(data));
  }

  public get id(): PackId {
    return this.manifest.id;
  }
}

/** How apps reference a pack without bundling it: a lazy dynamic import. */
export interface ContentPackLoader {
  readonly id: PackId;
  readonly load: () => Promise<ContentPack>;
}
