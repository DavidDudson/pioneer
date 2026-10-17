import { PROPERTY_RUNES_MAX } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { HANDS_MAX, handsInUse, INVESTED_MAX, investedCount } from './item-carry';
import type { Carried } from './item-carry';
import type { KeyItemId } from './key-item-id';
import type { ItemRunes } from './rune-etching';

/** Where an inventory line came from: the player added it, or an import brought it in as it was. */
export const ItemOrigin = { Player: 'player', Import: 'import' } as const;
export type ItemOrigin = ValueOf<typeof ItemOrigin>;

/** A line as the origin checks read it. A line with no `origin` is the player's. */
interface Originated extends Carried {
  readonly origin?: typeof ItemOrigin.Import | undefined;
  readonly keyItem?: KeyItemId | undefined;
  readonly runes?: ItemRunes | undefined;
}

/** Whether the player added the line: an imported line and a key item's line are kept as given. */
function isPlayers({ origin, keyItem }: Originated): boolean {
  return origin === undefined && keyItem === undefined;
}

/**
 * A check on an inventory's lines: the player's lines are held to the core limits the schema enforces, being no more
 * held than two hands hold, no more invested than the limit and no more property runes than an item can hold. Imported
 * lines and key items' lines are kept as given and not held to them; `inventoryViolations` reports what an imported
 * line breaks, and a key item breaks nothing.
 */
export function playerLimits(context: z.core.ParsePayload<readonly Originated[]>): void {
  const player = context.value.filter((each) => isPlayers(each));
  if (handsInUse(player) > HANDS_MAX) {
    context.issues.push({ code: 'custom', input: context.value, message: 'More held than hands hold' });
  }
  if (investedCount(player) > INVESTED_MAX) {
    context.issues.push({ code: 'custom', input: context.value, message: 'Too many invested' });
  }
  for (const [index, each] of context.value.entries()) {
    const { runes } = each;
    if (isPlayers(each) && (runes?.property.length ?? 0) > PROPERTY_RUNES_MAX) {
      context.issues.push({
        code: 'custom',
        input: runes,
        path: [index, 'runes', 'property'],
        message: 'Too many property runes',
      });
    }
  }
}
