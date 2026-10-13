import { Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The sheet sections that list feats, each with its own grant-only filter (play-and-campaigns.md, Feat display). */
export const FeatDisplaySection = {
  Feats: 'feats',
} as const;
export type FeatDisplaySection = ValueOf<typeof FeatDisplaySection>;

export const FeatDisplaySectionSchema = z.enum(FeatDisplaySection);

/** A remembered filter's own row id, for the audit trail. */
export const FeatDisplayId = Uuid.brand<'FeatDisplayId'>();
export type FeatDisplayId = z.infer<typeof FeatDisplayId>;

/**
 * The sections of a character's sheet where a user chose to show its grant-only feats, a display preference
 * (ADR-0052). Grant-only feats are hidden everywhere else, so a user who never chose has none.
 */
export const FeatDisplayChoice = z.strictObject({ showGrantOnly: z.array(FeatDisplaySectionSchema).readonly() });
export type FeatDisplayChoice = z.output<typeof FeatDisplayChoice>;

/** Shows or hides the grant-only feats in `section`. */
export const SetFeatDisplayBody = z.strictObject({ section: FeatDisplaySectionSchema, showGrantOnly: z.boolean() });
export type SetFeatDisplayBody = z.output<typeof SetFeatDisplayBody>;
