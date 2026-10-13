import { MagicTradition, SpellPreparation } from '@pioneer/rules/sdk';
import type { MagicTradition as Tradition, SpellPreparation as Preparation } from '@pioneer/rules/sdk';

/** Message keys the spellcasting list renders with, spelled out so the key check sees them. */
export const SpellcastingMessage = {
  None: 'rules.spellcasting.none',
  Origin: 'rules.spellcasting.origin',
  Slots: 'rules.spellcasting.slots',
  PoolSlots: 'rules.spellcasting.poolSlots',
  Cantrips: 'rules.spellcasting.cantrips',
  Rank: 'rules.spellcasting.rank',
} as const;

/** Each tradition's name. */
export const TRADITION_MESSAGES: Readonly<Record<Tradition, string>> = {
  [MagicTradition.Arcane]: 'rules.facet.tradition.arcane',
  [MagicTradition.Divine]: 'rules.facet.tradition.divine',
  [MagicTradition.Occult]: 'rules.facet.tradition.occult',
  [MagicTradition.Primal]: 'rules.facet.tradition.primal',
};

/** How each kind of entry casts. */
export const PREPARATION_MESSAGES: Readonly<Record<Preparation, string>> = {
  [SpellPreparation.Prepared]: 'rules.spellcasting.preparation.prepared',
  [SpellPreparation.Spontaneous]: 'rules.spellcasting.preparation.spontaneous',
  [SpellPreparation.Innate]: 'rules.spellcasting.preparation.innate',
  [SpellPreparation.Focus]: 'rules.spellcasting.preparation.focus',
};
