import { ContentPackId } from '@pioneer/rules/sdk';
import { Uuid } from '@pioneer/shared/kernel';
import type { Temporal, UserId, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** Row id of one pack a character has enabled; the audit log keys every row by an `id`. */
export const CharacterPackId = Uuid.brand<'CharacterPackId'>();
export type CharacterPackId = z.infer<typeof CharacterPackId>;

/** A pack's title as the content tables show it; the character context only displays it. */
export const PackTitle = z.string().min(1).brand<'PackTitle'>();
export type PackTitle = z.infer<typeof PackTitle>;

/** A pack's publisher as the content tables show it; the character context only displays it. */
export const PackPublisher = z.string().min(1).brand<'PackPublisher'>();
export type PackPublisher = z.infer<typeof PackPublisher>;

/** A campaign's name as the campaign context shows it; the character context only displays it. */
export const AttachedCampaignName = z.string().min(1).brand<'AttachedCampaignName'>();
export type AttachedCampaignName = z.infer<typeof AttachedCampaignName>;

/** A campaign's id, so the sheet can link to the campaign; the character context only carries it. */
export const AttachedCampaignId = Uuid.brand<'AttachedCampaignId'>();
export type AttachedCampaignId = z.infer<typeof AttachedCampaignId>;

/** A homebrew pack a character has enabled. Official packs are always on, so they have no row. */
export interface CharacterPack {
  readonly id: CharacterPackId;
  readonly packId: ContentPackId;
  /** The owner who enabled it; absent once their account is deleted. */
  readonly enabledBy: UserId | undefined;
  readonly enabledAt: Temporal.Instant;
}

/** Who decides which packs a character uses: the character's owner, or the campaign it is attached to. */
export const PackAuthority = { Character: 'character', Campaign: 'campaign' } as const;
export type PackAuthority = ValueOf<typeof PackAuthority>;
export const PackAuthoritySchema = z.enum(PackAuthority);

/** A pack as the character's pack list names it. */
const PackListing = z.object({
  packId: ContentPackId,
  title: PackTitle,
  publisher: PackPublisher,
  official: z.boolean(),
});
type PackListing = z.output<typeof PackListing>;

/** A pack the character uses: an official one, always on, or a homebrew one that is enabled. */
export const EnabledPack = PackListing.extend({
  /** The enabled packs that extend it, by title. It stays on while any does. */
  requiredBy: z.array(PackTitle).readonly(),
  /** Whether the viewer may disable it: its owner, for a homebrew pack nothing enabled extends and no campaign decides. */
  removable: z.boolean(),
});
export type EnabledPack = z.output<typeof EnabledPack>;

/** A pack the owner could enable. */
export const PackCandidate = PackListing.extend({
  /** Only its owner reads a private pack, so only a character of its owner can use it. */
  private: z.boolean(),
});
export type PackCandidate = z.output<typeof PackCandidate>;

/** JSON shape of a character's packs: the effective set, and who decides it. */
export const CharacterPacks = z.object({
  decidedBy: PackAuthoritySchema,
  /** The campaign that decides, when one does. */
  campaign: AttachedCampaignName.optional(),
  /** Whether the viewer may enable and disable packs: the owner, while no campaign decides. */
  manageable: z.boolean(),
  /** Official packs first, then homebrew ones, each by title. */
  enabled: z.array(EnabledPack).readonly(),
  /** The packs the owner may read and has not enabled, by title. Empty while a campaign decides. */
  candidates: z.array(PackCandidate).readonly(),
});
export type CharacterPacks = z.output<typeof CharacterPacks>;

/** Which pack the owner enables. */
export const EnablePackBody = z.object({ packId: ContentPackId });
export type EnablePackBody = z.infer<typeof EnablePackBody>;
