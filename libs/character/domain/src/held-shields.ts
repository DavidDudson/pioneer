import { battleFormInPlay, NO_MODIFIERS } from '@pioneer/rules/engine';
import type { FormInPlay, ModifierInputs } from '@pioneer/rules/engine';
import { ContentKind, Hardness, HitPoints, NumericItemProperty } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { ContentNamespace, derivedId } from '@pioneer/shared/kernel';

import { itemsIn } from './active-items';
import { InventoryItemId } from './inventory';
import type { Inventory } from './inventory';
import { equippedState } from './inventory-content';
import type { ItemContent } from './inventory-content';
import { alteredItem } from './item-alteration-inputs';

/** A shield the character holds: what the sheet shows beside its Strikes. */
export interface HeldShield {
  /** The inventory item that holds it, which keeps the damage it has taken. */
  readonly item: InventoryItemId;
  readonly entry: ContentId;
  readonly hardness: Hardness;
  readonly hitPoints: HitPoints;
  /** Half its Hit Points, rounded down: at or below it the shield is broken. */
  readonly brokenThreshold: HitPoints;
  /** A shield of a battle form: it cannot be damaged, so it never breaks and its Hit Points are not kept. */
  readonly undamageable?: true;
}

const BROKEN_DIVISOR = 2;

const NO_HIT_POINTS = HitPoints.parse(0);

/** The shield a battle form carries, as a held one: its id comes from the form's rule, so it is the same every time. */
function formShield(form: FormInPlay | undefined): readonly HeldShield[] {
  const shield = form?.form.shield;
  if (form === undefined || shield === undefined) {
    return [];
  }
  return [
    {
      item: InventoryItemId.parse(derivedId(ContentNamespace, `form-shield/${form.id}`)),
      entry: form.origin.entry,
      hardness: shield.hardness,
      hitPoints: NO_HIT_POINTS,
      brokenThreshold: NO_HIT_POINTS,
      undamageable: true,
    },
  ];
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
  return [...held, ...formShield(battleFormInPlay(inPlay))];
}
