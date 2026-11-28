import { Level, RollOption } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { CharacterDocument } from './character-document';
import { preparedReads } from './slot-reads';
import type { SlotContent } from './slot-reads';

/** How many familiar or master abilities a character selects each day, or one source's part of it. */
export const FamiliarAbilityCount = z.int().nonnegative().brand<'FamiliarAbilityCount'>();

export type FamiliarAbilityCount = z.infer<typeof FamiliarAbilityCount>;

/** What adds to the abilities a familiar carries: the base rule, feats and the witch's own. */
export const FamiliarAbilitySource = {
  Base: 'base',
  EnhancedFamiliar: 'enhanced-familiar',
  IncredibleFamiliar: 'incredible-familiar',
  WitchFamiliar: 'witch-familiar',
  WitchGrowth: 'witch-growth',
} as const;

export type FamiliarAbilitySource = ValueOf<typeof FamiliarAbilitySource>;

/** One source's part of the count; a source that adds nothing is left out. */
export interface FamiliarAbilityPart {
  readonly source: FamiliarAbilitySource;
  readonly amount: FamiliarAbilityCount;
}

/** The abilities a familiar carries each day: the total and each source's part of it. */
export interface FamiliarAbilities {
  readonly total: FamiliarAbilityCount;
  readonly parts: ReadonlyArray<FamiliarAbilityPart>;
}

/** What the count reads: the character's level and the roll options its grants set (`feat:enhanced-familiar`). */
export interface FamiliarAbilityInputs {
  readonly level: Level;
  readonly options: ReadonlyArray<RollOption>;
}

const BASE = FamiliarAbilityCount.parse(2);
const FEAT_BONUS = FamiliarAbilityCount.parse(2);
const WITCH_BONUS = FamiliarAbilityCount.parse(2);
const GROWTH = FamiliarAbilityCount.parse(1);

/** The levels at which a witch's familiar gains another ability (Player Core, Familiar (Witch)). */
const WITCH_GROWTH_FIRST = Level.parse(6);
const WITCH_GROWTH_SECOND = Level.parse(12);
const WITCH_GROWTH_THIRD = Level.parse(18);
const WITCH_GROWTH_LEVELS: ReadonlyArray<Level> = [WITCH_GROWTH_FIRST, WITCH_GROWTH_SECOND, WITCH_GROWTH_THIRD];

const ENHANCED_FAMILIAR_OPTION = RollOption.parse('feat:enhanced-familiar');
const INCREDIBLE_FAMILIAR_OPTION = RollOption.parse('feat:incredible-familiar');
const WITCH_CLASS_OPTION = RollOption.parse('class:witch');
const NONE = FamiliarAbilityCount.parse(0);

/** `amount` from `source` when `applies`, none otherwise. */
function part(applies: boolean, source: FamiliarAbilitySource, amount: FamiliarAbilityCount): FamiliarAbilityPart {
  return { source, amount: applies ? amount : NONE };
}

/** Enhanced and Incredible Familiar each add their own two, and the witch's bonus stacks on top. */
export function familiarAbilities({ level, options }: FamiliarAbilityInputs): FamiliarAbilities {
  const has = (option: RollOption): boolean => options.includes(option);
  const isWitch = has(WITCH_CLASS_OPTION);
  const growthLevelsReached = WITCH_GROWTH_LEVELS.filter((at) => level >= at).length;

  const candidates: ReadonlyArray<FamiliarAbilityPart> = [
    part(true, FamiliarAbilitySource.Base, BASE),
    part(has(ENHANCED_FAMILIAR_OPTION), FamiliarAbilitySource.EnhancedFamiliar, FEAT_BONUS),
    part(has(INCREDIBLE_FAMILIAR_OPTION), FamiliarAbilitySource.IncredibleFamiliar, FEAT_BONUS),
    part(isWitch, FamiliarAbilitySource.WitchFamiliar, WITCH_BONUS),
    part(isWitch, FamiliarAbilitySource.WitchGrowth, FamiliarAbilityCount.parse(growthLevelsReached * GROWTH)),
  ];

  const parts = candidates.filter(({ amount }) => amount > 0);
  const total = FamiliarAbilityCount.parse(parts.reduce((sum, { amount }) => sum + amount, 0));

  return { total, parts };
}

/** The abilities the character's familiar carries each day at its level, over every pick it holds. */
export function familiarAbilitiesOf(document: CharacterDocument, content: SlotContent): FamiliarAbilities {
  const level = Level.parse(document.level);

  return familiarAbilities({ level, options: preparedReads(document, content, level).resolution.rollOptions });
}
