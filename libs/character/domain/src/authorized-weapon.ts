import { ContentKind, DamageFormula, entrySlug, Slug } from '@pioneer/rules/sdk';
import type { EntrySlug } from '@pioneer/rules/sdk';

import type { CharacterName } from './character-fields';
import type { InventoryItem } from './inventory';
import type { ItemEntry } from './inventory-content';
import { CarryState } from './item-carry';
import { hasEtchedRune, itemRunes } from './item-runes';
import type { RuneContent } from './item-runes';
import { AuthorizedName } from './item-state';

const AUTHORIZED: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('authorized'));

/** What an authorized weapon does to a wielder who is not allowed to hold it: piercing damage and persistent bleed. */
export interface AuthorizedDamage {
  readonly piercing: DamageFormula;
  readonly bleed: DamageFormula;
}

/** Whether the item has an authorized rune etched on it. */
export function hasAuthorizedRune(line: InventoryItem, base: ItemEntry | undefined, runes: RuneContent): boolean {
  return hasEtchedRune(line, base, { runes, slug: AUTHORIZED });
}

/**
 * The damage of the needles of an authorized weapon: one d8 piercing and one d4 persistent bleed for each damage die,
 * which is the weapon's base die and the dice its striking rune adds (two for striking, three for greater, four for
 * major). Undefined when the item has no authorized rune.
 */
export function authorizedDamage(
  line: InventoryItem,
  base: ItemEntry | undefined,
  runes: RuneContent,
): AuthorizedDamage | undefined {
  if (!hasAuthorizedRune(line, base, runes)) {
    return undefined;
  }
  const dice = (itemRunes(line, base).striking ?? 0) + 1;
  return { piercing: DamageFormula.parse(`${dice}d8`), bleed: DamageFormula.parse(`${dice}d4`) };
}

/** A name as the rune compares it: without case. */
function named(name: AuthorizedName | CharacterName): AuthorizedName {
  return AuthorizedName.parse(name.toLowerCase());
}

/**
 * The damage `wielder` takes holding the item, when it has an authorized rune, says who may wield it and `wielder` is
 * neither its owner nor one of the others allowed. Undefined when the item is not held, names no owner (nothing says
 * who the rightful owner is) or the wielder may hold it.
 */
export function unauthorizedWielder(
  line: InventoryItem,
  base: ItemEntry | undefined,
  reads: { readonly runes: RuneContent; readonly wielder: CharacterName },
): AuthorizedDamage | undefined {
  const allowed = line.state?.authorized;
  if (allowed === undefined || line.carry.state !== CarryState.Held) {
    return undefined;
  }
  const wielder = named(reads.wielder);
  if ([allowed.owner, ...allowed.others].some((each) => named(each) === wielder)) {
    return undefined;
  }
  return authorizedDamage(line, base, reads.runes);
}
