import { CompanionTier, ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

const PLAYER_CORE = PackId.parse('player-core');

function featId(slug: EntrySlug): ContentId {
  return ContentId.parse(contentId(PLAYER_CORE, slug));
}

/**
 * The feats that move an animal companion up a tier (Player Core p. 211), druid and ranger variants alike. Nimble and
 * savage are a choice the player makes with Incredible Companion, so they are not read from feats here.
 */
const TIER_FEATS: ReadonlyMap<string, CompanionTier> = new Map([
  [featId(EntrySlug.parse('feat:mature-animal-companion-druid')), CompanionTier.Mature],
  [featId(EntrySlug.parse('feat:mature-animal-companion-ranger')), CompanionTier.Mature],
  [featId(EntrySlug.parse('feat:specialized-companion-druid')), CompanionTier.Specialized],
  [featId(EntrySlug.parse('feat:specialized-companion-ranger')), CompanionTier.Specialized],
]);

/** The tiers the master's feats give a companion: one per upgrade feat held, so removing the feat lowers the tier. */
export function companionTiersFromFeats(held: Iterable<string>): ReadonlySet<CompanionTier> {
  const tiers = new Set<CompanionTier>();

  for (const id of held) {
    const tier = TIER_FEATS.get(id);

    if (tier !== undefined) {
      tiers.add(tier);
    }
  }

  return tiers;
}
