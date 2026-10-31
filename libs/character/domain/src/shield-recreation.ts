import type { ActiveSpellId } from './active-spell-id';
import type { ActiveEffect } from './effects';
import type { ShieldGrant } from './held-shields';
import type { InventoryItemId } from './inventory';
import type { PlayState } from './play-state';

type KeptShields = PlayState['shields'];

/** `shields` without the damage on the shield `item`, as when it is destroyed or repaired. */
export function shieldCleared(shields: KeptShields, item: InventoryItemId): KeptShields {
  return Object.fromEntries(Object.entries(shields).filter(([key]) => key !== item));
}

/** Whether a destroyed shield stays so for its spell to recreate: its grant says so, and its effect came from an active spell. */
export function awaitsSustain(effects: readonly ActiveEffect[], granted: ShieldGrant | undefined): boolean {
  return (
    granted?.recreatedOnSustain === true &&
    effects.some((each) => each.effect === granted.effect && each.spell !== undefined)
  );
}

/** The held shields, as far as being recreated goes. */
type Recreatable = ReadonlyMap<InventoryItemId, { readonly granted?: ShieldGrant }>;

/**
 * `play` once the spell `spell` is sustained: each shield that its effects give, which a block destroyed, is whole again.
 * An effect not applied from the spell, or a shield whose grant is not recreated on Sustain, is left as it was.
 */
export function shieldsRecreated(play: PlayState, spell: ActiveSpellId, shields: Recreatable): PlayState {
  const effects = new Set(play.effects.filter((each) => each.spell === spell).map(({ effect }) => effect));
  const recreated = [...shields]
    .filter(([, { granted }]) => granted?.recreatedOnSustain === true && effects.has(granted.effect))
    .map(([item]): InventoryItemId => item);
  let kept = play.shields;
  for (const item of recreated) {
    kept = shieldCleared(kept, item);
  }
  return { ...play, shields: kept };
}
