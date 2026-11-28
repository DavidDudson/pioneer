import { ContentKind, entrySlug, Modifier, Slug } from '@pioneer/rules/sdk';
import type { EntrySlug } from '@pioneer/rules/sdk';

import type { InventoryItem } from './inventory';
import type { ItemEntry } from './inventory-content';
import { hasEtchedRune } from './item-runes';
import type { RuneContent } from './item-runes';
import { weaponGrades } from './weapon-grades';
import type { GradeReads } from './weapon-grades';

const ANIMATED: EntrySlug = entrySlug(ContentKind.Rune, Slug.parse('animated'));

/** The attack modifier a set-free animated weapon makes Strikes with, before its item bonus (GM Core). */
const ANIMATED_ATTACK = Modifier.parse(24);

/** Whether the item has an animated rune etched on it. */
export function hasAnimatedRune(line: InventoryItem, base: ItemEntry | undefined, runes: RuneContent): boolean {
  return hasEtchedRune(line, base, { runes, slug: ANIMATED });
}

/**
 * The attack modifier of the Strikes a set-free animated weapon makes: 24 plus its item bonus, which its potency grade
 * gives after the alterations in play (Automatic Bonus Progression sets the runes' to nothing). Undefined while the item is not set free or has no animated rune.
 */
export function releasedAttack(
  line: InventoryItem,
  base: ItemEntry | undefined,
  reads: GradeReads,
): Modifier | undefined {
  if (line.state?.released !== true || !hasAnimatedRune(line, base, reads.runes)) {
    return undefined;
  }

  const bonus = weaponGrades(line, base, reads).potency ?? 0;

  return Modifier.parse(ANIMATED_ATTACK + bonus);
}
