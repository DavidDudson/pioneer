import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { ContentKind, ContentKindSchema } from './content-kind';
import { RulesMessage } from './messages';

/** A trait slug (`humanoid`, `undead`). Content defines the set, so it is a brand, not a const object. */
export const Trait = Slug.brand<'Trait'>();
export type Trait = z.infer<typeof Trait>;

/** What a creature is immune to: a damage type, condition or effect (`poison`, `paralyzed`, `death-effects`). */
export const Immunity = Slug.brand<'Immunity'>();
export type Immunity = z.infer<typeof Immunity>;

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
