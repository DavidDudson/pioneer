import { slotCountKey, spellCost } from '@pioneer/character/domain';
import type { PreparedSlot, SlotCountKey, SpellOption, TurnState } from '@pioneer/character/domain';
import { SlotRank } from '@pioneer/rules/sdk';
import type { UsableLine } from '@pioneer/rules/ui';

import { affordability } from './sheet-actions';

/** What casting is checked against on the sheet: the turn, the slots left of each rank and the Focus Points left. */
export interface SpellSpend {
  readonly turn: TurnState | undefined;
  /** The slots held under `key`; none for a key the build gives no slots under. */
  readonly slotsLeft: (key: SlotCountKey) => number;
  readonly focusLeft: number;
}

/** What casting a spell pays besides its actions: a slot of the rank it is cast at, or a Focus Point; a cantrip pays nothing. */
export interface SpellPayment {
  readonly slot?: SlotCountKey | undefined;
  readonly focus?: boolean | undefined;
}

/**
 * Casting `spell` as a line to use: its cost from the content, what it pays, and whether the turn, the slots and the
 * Focus Points left can pay for it now, so the sheet offers only a cast the server would accept.
 */
export function spellUse(spell: SpellOption, payment: SpellPayment, spend: SpellSpend): UsableLine {
  const range = spellCost(spell);
  const actions = affordability(spend.turn, range?.cost, range?.upTo);
  const slotLeft = payment.slot === undefined || spend.slotsLeft(payment.slot) > 0;
  const focusLeft = payment.focus !== true || spend.focusLeft > 0;
  const pays = payment.slot !== undefined || payment.focus === true;
  return {
    id: spell.id,
    name: spell.name,
    cost: range?.cost,
    upTo: range?.upTo,
    payment: pays ? { slot: payment.slot, focus: payment.focus } : undefined,
    affordable: (actions.affordable ?? true) && slotLeft && focusLeft,
    affordableUpTo: actions.affordableUpTo,
  };
}

/** The key the slots of a prepared slot's rank are counted under; a cantrip has none. */
export function slotKeyOf({ entry, pool, rank }: PreparedSlot): SlotCountKey | undefined {
  return rank === SlotRank.Cantrip ? undefined : slotCountKey(entry, pool?.slug, rank);
}
