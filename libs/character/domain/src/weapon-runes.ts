import { CopperValue, FundamentalRune, Rarity, RunedItem, RuneType } from '@pioneer/rules/sdk';
import type { Temporal } from '@pioneer/shared/kernel';

import type { Character } from './character';
import type { CharacterLevel } from './character-fields';
import { CharacterPatchField } from './character-patch';
import { ItemQuantity } from './inventory';
import type { InventoryItemId } from './inventory';
import type { ItemContent } from './inventory-content';
import type { RuneContent, RuneEntry } from './item-runes';
import { coinsOf, coinsValue, purchaseCost } from './purse';
import { RuneAction } from './rune-edits';
import type { RuneEdit } from './rune-edits';
import { RuneEtchingSchema } from './rune-etching';
import type { RuneEtching } from './rune-etching';
import { runeRefusal } from './rune-refusal';

/** The fundamental runes a weapon is given, potency first. */
const WEAPON_RUNES = [FundamentalRune.Potency, FundamentalRune.Striking] as const;

const ONE_ITEM = ItemQuantity.parse(1);
/** The divisor of the coins left that the runes of one weapon may cost: half. */
const SHARE = ItemQuantity.parse(2);

/** What a weapon's runes are bought from: the rune and item content, the clock and the share of coins left they may cost. */
export interface RuneShop {
  readonly items: ItemContent;
  readonly runes: RuneContent;
  readonly now: Temporal.Instant;
}

/** What one rune of `entry` costs; undefined when it has no price. */
function priceOf(entry: RuneEntry): CopperValue | undefined {
  return entry.data.price === undefined ? undefined : purchaseCost(entry.data.price, ONE_ITEM);
}

/** A rune to etch, and what it costs. */
interface Priced {
  readonly etching: RuneEtching;
  readonly cost: CopperValue;
}

/** What a rune is looked for by: the level of the character, the rune and the coins it may cost. */
interface RuneWant {
  readonly level: CharacterLevel;
  readonly rune: FundamentalRune;
  readonly left: CopperValue;
}

/** The highest grade of `rune` for a weapon that a character of `level` can have and `left` pays for: common, and no higher in level than it. */
function bestRune(shop: RuneShop, want: RuneWant): Priced | undefined {
  const { runes } = shop;
  const { level, rune, left } = want;
  const offered = [...runes.values()].filter((entry) => {
    const price = priceOf(entry);
    return (
      entry.data.type === RuneType.Fundamental &&
      entry.data.rune === rune &&
      entry.data.etchedOnto.item === RunedItem.Weapon &&
      entry.rarity === Rarity.Common &&
      entry.level <= level &&
      price !== undefined &&
      price <= left
    );
  });
  const [best] = offered.toSorted((first, second) => second.level - first.level);
  const cost = best === undefined ? undefined : priceOf(best);
  return best?.data.type === RuneType.Fundamental && cost !== undefined
    ? { etching: RuneEtchingSchema.parse({ type: RuneType.Fundamental, rune, grade: best.data.grade }), cost }
    : undefined;
}

/** Whether the inventory of `character` accepts `edit`. */
function allowed(character: Character, edit: RuneEdit, shop: RuneShop): boolean {
  return runeRefusal(shop, character.document.inventory, edit) === undefined;
}

/**
 * `character` with the best fundamental runes it can afford etched onto its weapon `id`: potency, then striking, each
 * at the highest grade of a common rune its level allows and half the coins left cover. The runes are paid for from
 * its purse. A rune the inventory refuses is left off.
 */
export function etchWeapon(character: Character, id: InventoryItemId, shop: RuneShop): Character {
  let runed = character;
  for (const rune of WEAPON_RUNES) {
    const left = coinsValue(runed.document.inventory.coins);
    const best = bestRune(shop, {
      level: runed.document.level,
      rune,
      left: CopperValue.parse(Math.floor(left / SHARE)),
    });
    if (best !== undefined && allowed(runed, { action: RuneAction.Etch, id, rune: best.etching }, shop)) {
      const paid = coinsOf(CopperValue.parse(left - best.cost));
      runed = runed
        .apply({ field: CharacterPatchField.EtchRune, id, rune: best.etching }, shop.now)
        .apply({ field: CharacterPatchField.SetCoins, coins: paid }, shop.now);
    }
  }
  return runed;
}
