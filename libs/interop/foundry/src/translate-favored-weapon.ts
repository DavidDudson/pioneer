import { FAVORED_WEAPON, Proficiency, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** Foundry's ranks by number, trained (1) to legendary (4). */
const RANKS = [Proficiency.Trained, Proficiency.Expert, Proficiency.Master, Proficiency.Legendary] as const;
const LOWEST_RANK = 1;

/** Foundry's raise of the favoured weapon rank: an `ActiveEffectLike` upgrading `favoredWeaponRank` to a fixed rank. */
const FoundryFavoredWeaponRank = z.strictObject({
  key: z.literal('ActiveEffectLike'),
  mode: z.literal('upgrade'),
  path: z.literal('flags.system.favoredWeaponRank'),
  value: z.number().int().min(LOWEST_RANK).max(RANKS.length),
  predicate: z.unknown().optional(),
});

/**
 * Foundry's `ActiveEffectLike` upgrading `flags.system.favoredWeaponRank` (Deity (Cleric), a warpriest's doctrines),
 * which `DeityPF2e.setFavoredWeaponRank` applies to each of the deity's favoured weapons, as a `Proficiency` element
 * raising `attack:favored-weapon` (ADR-0048). A formula value or any other field leaves it for the backlog.
 */
export function withFavoredWeaponRank(raw: unknown): unknown {
  const raise = FoundryFavoredWeaponRank.safeParse(raw);
  if (!raise.success) {
    return raw;
  }
  const { value, predicate } = raise.data;
  return {
    key: RuleElementKey.Proficiency,
    selector: FAVORED_WEAPON,
    rank: RANKS[value - LOWEST_RANK],
    ...(predicate === undefined ? {} : { predicate }),
  };
}
