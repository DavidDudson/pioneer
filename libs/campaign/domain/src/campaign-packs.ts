import type { Temporal, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { EnabledPackId, PackPublisher, PackTitle } from './campaign-fields';
import type { CampaignPackId } from './campaign-fields';

/** A homebrew pack a campaign has enabled. Official packs are always on, so they have no row. */
export interface CampaignPack {
  readonly id: CampaignPackId;
  readonly packId: EnabledPackId;
  /** The GM who enabled it; absent once their account is deleted. */
  readonly enabledBy: UserId | undefined;
  readonly enabledAt: Temporal.Instant;
}

/** A pack as the campaign's pack list names it. */
export const PackListing = z.object({
  packId: EnabledPackId,
  title: PackTitle,
  publisher: PackPublisher,
  official: z.boolean(),
});
export type PackListing = z.output<typeof PackListing>;

/** A pack the campaign uses: an official one, always on, or a homebrew one a GM enabled. */
export const EnabledPack = PackListing.extend({
  /** The enabled packs that extend it, by title. It stays on while any does. */
  requiredBy: z.array(PackTitle).readonly(),
  /** Whether the viewer may disable it: the GM, for a homebrew pack nothing enabled extends. */
  removable: z.boolean(),
});
export type EnabledPack = z.output<typeof EnabledPack>;

/** A pack the GM could enable. */
export const PackCandidate = PackListing.extend({
  /** A private pack is refused until its owner shares it with campaigns. */
  private: z.boolean(),
});
export type PackCandidate = z.output<typeof PackCandidate>;

/** JSON shape of a campaign's packs, as one of its members sees them. */
export const CampaignPacks = z.object({
  /** Whether the viewer may enable and disable packs: the GM. */
  manageable: z.boolean(),
  /** Official packs first, then homebrew ones, each by title. */
  enabled: z.array(EnabledPack).readonly(),
  /** The packs the GM may read and has not enabled, by title. Empty for a player. */
  candidates: z.array(PackCandidate).readonly(),
});
export type CampaignPacks = z.output<typeof CampaignPacks>;
