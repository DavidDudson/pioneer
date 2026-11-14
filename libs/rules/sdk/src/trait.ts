import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId, contentId, entrySlug, PackId, Slug } from './content-id';
import { ContentKind, ContentKindSchema } from './content-kind';
import { RulesMessage } from './messages';

/** A trait slug (`humanoid`, `undead`). Content defines the set, so it is a brand, not a const object. */
export const Trait = Slug.brand<'Trait'>();
export type Trait = z.infer<typeof Trait>;

/** The pack that holds the trait vocabulary: every trait entry, whichever book it came from, is filed here. */
const TRAIT_PACK = PackId.parse('core-rules');

/**
 * The stored id of the entry that defines trait `slug`: `contentId` of `core-rules/trait:<slug>`, so a trait chip can
 * open its card without a lookup table.
 */
export function traitId(slug: Trait): ContentId {
  return ContentId.parse(contentId(TRAIT_PACK, entrySlug(ContentKind.Trait, slug)));
}

/** What a creature is immune to: a damage type, condition or effect (`poison`, `paralyzed`, `death-effects`). */
export const Immunity = Slug.brand<'Immunity'>();
export type Immunity = z.infer<typeof Immunity>;

/**
 * What a weakness or resistance does not cover: a damage trait, such as a material (`adamantine`, `cold-iron`) or
 * `magical` (`resistance 5 physical except adamantine`). Foundry pf2e keeps the set in config, so it is a brand.
 */
export const DamageException = Slug.brand<'DamageException'>();
export type DamageException = z.infer<typeof DamageException>;

const KIND_COUNT = Object.keys(ContentKind).length;

/**
 * A trait's `data` on the `ContentEntry` envelope. The trait entry's slug is what entries list in `traits`; its
 * name and description are the envelope's.
 */
export const TraitData = z
  .strictObject({
    /** The kinds of entry that carry it, as Foundry pf2e files it (`manipulate` on actions, feats and spells). */
    appliesTo: z.array(ContentKindSchema).max(KIND_COUNT).readonly(),
  })
  .check((context) => {
    const seen = new Set<ContentKind>();
    for (const [index, kind] of context.value.appliesTo.entries()) {
      if (seen.has(kind)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: ['appliesTo', index],
          ...issueParams(message(RulesMessage.TraitDuplicateKind, { kind })),
        });
      }
      seen.add(kind);
    }
  });
export type TraitData = z.infer<typeof TraitData>;
