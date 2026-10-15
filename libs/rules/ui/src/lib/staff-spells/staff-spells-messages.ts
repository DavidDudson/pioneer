import { StaffSpellBlock } from './staff-spells-line';

/** Message keys the staff spells list renders with, spelled out so the key check sees them. */
export const StaffSpellsMessage = {
  Charges: 'rules.staffSpells.charges',
  NotPrepared: 'rules.staffSpells.notPrepared',
  Cantrip: 'rules.staffSpells.cantrip',
  Cost: 'rules.staffSpells.cost',
} as const;

/** Why a staff spell can't be cast, by block. */
export const STAFF_SPELL_BLOCK_MESSAGES = {
  [StaffSpellBlock.NotOnList]: 'rules.staffSpells.notOnList',
  [StaffSpellBlock.RankTooHigh]: 'rules.staffSpells.rankTooHigh',
} as const;
