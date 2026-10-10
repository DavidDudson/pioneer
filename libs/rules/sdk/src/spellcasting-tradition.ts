import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { SkillSelector } from './selector';

/** The four traditions of magic. Foundry pf2e keeps the set in config; each also has a `spellcasting-tradition` entry. */
export const MagicTradition = { Arcane: 'arcane', Divine: 'divine', Occult: 'occult', Primal: 'primal' } as const;
export type MagicTradition = ValueOf<typeof MagicTradition>;
export const MagicTraditionSchema = z.enum(MagicTradition);

/**
 * A spellcasting tradition's `data` on the `ContentEntry` envelope: the skill that recalls and identifies its magic
 * (Arcana for arcane). Its slug is the tradition spells list.
 */
export const SpellcastingTraditionData = z.strictObject({ skill: SkillSelector });
export type SpellcastingTraditionData = z.infer<typeof SpellcastingTraditionData>;
