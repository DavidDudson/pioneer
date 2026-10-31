import { NO_MODIFIERS, shieldsInPlay } from '@pioneer/rules/engine';
import type { ModifierInputs, ShieldInPlay } from '@pioneer/rules/engine';
import { ContentKind, Hardness, HitPoints, NumericItemProperty } from '@pioneer/rules/sdk';
import type { ContentId, HardnessBonus, ShardDamage } from '@pioneer/rules/sdk';
import { ContentNamespace, derivedId } from '@pioneer/shared/kernel';

import { itemsIn } from './active-items';
import { InventoryItemId } from './inventory';
import type { Inventory } from './inventory';
import { equippedState } from './inventory-content';
import type { ItemContent } from './inventory-content';
import { alteredItem } from './item-alteration-inputs';

/** What ends the effect that gives a shield, when it is one: the effect, and the blows that end it. */
export interface ShieldGrant {
  readonly effect: ContentId;
  readonly endsOnBlock: boolean;
  readonly endsWhenDestroyed: boolean;
  /** The damage to roll when the block that ends the effect breaks the shield. */
  readonly shards?: ShardDamage;
  /** The cast raised it, so it can block with no Raise a Shield. */
  readonly raised: boolean;
}

/** A shield the character holds: what the sheet shows beside its Strikes. */
export interface HeldShield {
  /** The inventory item that holds it, which keeps the damage it has taken. */
  readonly item: InventoryItemId;
  readonly entry: ContentId;
  readonly hardness: Hardness;
  readonly hitPoints: HitPoints;
  /** Half its Hit Points, rounded down: at or below it the shield is broken. */
  readonly brokenThreshold: HitPoints;
  /** A shield that cannot be damaged: it never breaks and no damage is kept for it. */
  readonly undamageable?: true;
  /** A shield an effect gives, which no inventory item holds: what ends that effect. */
  readonly granted?: ShieldGrant;
  /** Extra Hardness against damage of some types. */
  readonly hardnessAgainst?: readonly HardnessBonus[];
}

const BROKEN_DIVISOR = 2;

const NO_HIT_POINTS = HitPoints.parse(0);

/** A shield an effect gives, as a held one: its id comes from the rule that gives it, so it is the same every time. */
function grantedShield({
  id,
  source,
  hardness,
  hitPoints,
  brokenThreshold,
  endsOnBlock,
  endsWhenDestroyed,
  raised,
  hardnessAgainst,
  shards,
}: ShieldInPlay): HeldShield {
  const held: HeldShield = {
    item: InventoryItemId.parse(derivedId(ContentNamespace, `granted-shield/${id}`)),
    entry: source,
    hardness,
    hitPoints: hitPoints ?? NO_HIT_POINTS,
    brokenThreshold,
    granted: { effect: source, endsOnBlock, endsWhenDestroyed, raised, ...(shards === undefined ? {} : { shards }) },
  };
  const typed = hardnessAgainst.length === 0 ? held : { ...held, hardnessAgainst };
  return hitPoints === undefined ? { ...typed, undamageable: true } : typed;
}

/** The shields the effects in play give, as held ones. */
function grantedShields(inputs: ModifierInputs): readonly HeldShield[] {
  return shieldsInPlay(inputs).map((shield) => grantedShield(shield));
}

/**
 * Each shield held, in inventory order, with its Hardness, Hit Points and Broken Threshold from its content, as the
 * `ItemAlteration` elements in `rules` change them. A reinforcing rune does not change them yet.
 */
export function heldShields(
  inventory: Inventory,
  content: ItemContent,
  rules: () => ModifierInputs = () => NO_MODIFIERS,
): readonly HeldShield[] {
  const shields = itemsIn(inventory, content, equippedState).filter(({ entry }) => entry.kind === ContentKind.Shield);
  const inPlay = rules();
  const held = shields.flatMap(({ entry, item }): HeldShield[] => {
    if (entry.kind !== ContentKind.Shield) {
      return [];
    }
    const { numbers } = alteredItem(inPlay, entry);
    const hardness = Hardness.parse(numbers.get(NumericItemProperty.Hardness) ?? entry.data.hardness);
    const hitPoints = HitPoints.parse(numbers.get(NumericItemProperty.HitPointsMax) ?? entry.data.hitPoints);
    return [
      {
        entry: entry.id,
        item: item.id,
        hardness,
        hitPoints,
        brokenThreshold: HitPoints.parse(Math.floor(hitPoints / BROKEN_DIVISOR)),
      },
    ];
  });
  return [...held, ...grantedShields(inPlay)];
}
