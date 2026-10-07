import { z } from 'zod';

import { AncestryDefinition } from './ancestry';
import { PackId } from './content-id';
import { CreatureDefinition } from './creature';
import { ContentLicenseSchema } from './license';

export const ContentPackManifest = z.object({
  /** Prefix of every content key in the pack, e.g. `player-core`. */
  id: PackId,
  title: z.string().min(1),
  publisher: z.string().min(1),
  license: ContentLicenseSchema,
});
export type ContentPackManifest = z.infer<typeof ContentPackManifest>;

function uniqueSlugs(entries: readonly { readonly slug: string }[]): boolean {
  return new Set(entries.map((entry) => entry.slug)).size === entries.length;
}

export const ContentPackSchema = z.object({
  manifest: ContentPackManifest,
  ancestries: z.array(AncestryDefinition).readonly().refine(uniqueSlugs, 'Duplicate ancestry slug'),
  creatures: z.array(CreatureDefinition).readonly().refine(uniqueSlugs, 'Duplicate creature slug'),
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

  private constructor(data: z.output<typeof ContentPackSchema>) {
    this.manifest = data.manifest;
    this.ancestries = data.ancestries;
    this.creatures = data.creatures;
  }

  public static define(data: z.input<typeof ContentPackSchema>): ContentPack {
    return new ContentPack(ContentPackSchema.parse(data));
  }

  public get id(): string {
    return this.manifest.id;
  }
}

/** How apps reference a pack without bundling it: a lazy dynamic import. */
export interface ContentPackLoader {
  readonly id: string;
  readonly load: () => Promise<ContentPack>;
}
