import { WandBlock, WandCheckOutcome } from './wand-spells-line';

/** Message keys the wand section renders with, spelled out so the key check sees them. */
export const WandSpellsMessage = {
  Casts: 'rules.wandSpells.casts',
  Broken: 'rules.wandSpells.broken',
  Rank: 'rules.wandSpells.rank',
  Cast: 'rules.wandSpells.cast',
  Overcharge: 'rules.wandSpells.overcharge',
  Repair: 'rules.wandSpells.repair',
  Rolled: 'rules.wandSpells.rolled',
  Confirm: 'rules.wandSpells.confirm',
  Cancel: 'rules.wandSpells.cancel',
} as const;

/** Why a wand's spell can't be cast, by block. */
export const WAND_BLOCK_MESSAGES = {
  [WandBlock.NotOnList]: 'rules.wandSpells.notOnList',
  [WandBlock.RankTooHigh]: 'rules.wandSpells.rankTooHigh',
} as const;

/** What an overcharge would come to, by outcome. */
export const WAND_CHECK_MESSAGES = {
  [WandCheckOutcome.Broken]: 'rules.wandSpells.checkBroken',
  [WandCheckOutcome.Failed]: 'rules.wandSpells.checkFailed',
  [WandCheckOutcome.Repeated]: 'rules.wandSpells.checkRepeated',
} as const;
