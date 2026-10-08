import { Pg } from '@pioneer/shared/kernel';
import { z } from 'zod';

/**
 * Dice quantities. Limits keep a typed expression cheap to roll and to show:
 * the playground must not be able to hang the tab with `1000000d1000`.
 */
export const DICE_COUNT_MIN = 1;
export const DICE_COUNT_MAX = 100;
export const DIE_SIZE_MIN = 2;
export const DIE_SIZE_MAX = 1000;
export const FLAT_VALUE_MAX = 9999;
export const TERM_COUNT_MAX = 20;
export const EXPRESSION_LENGTH_MAX = 200;

/** How many dice one term rolls (`4` in `4d6kh3`), or how many it keeps (`3`). */
export const DiceCount = Pg.smallint().min(DICE_COUNT_MIN).max(DICE_COUNT_MAX).brand<'DiceCount'>();
export type DiceCount = z.infer<typeof DiceCount>;

/** Sides on a die (`6` in `2d6`). */
export const DieSize = Pg.smallint().min(DIE_SIZE_MIN).max(DIE_SIZE_MAX).brand<'DieSize'>();
export type DieSize = z.infer<typeof DieSize>;

/** The face one die landed on, 1 to its size. */
export const DieFace = Pg.smallint().min(DICE_COUNT_MIN).max(DIE_SIZE_MAX).brand<'DieFace'>();
export type DieFace = z.infer<typeof DieFace>;

/** A flat number in an expression (`7` in `1d20+7`); its sign belongs to the term. */
export const FlatValue = Pg.smallint().nonnegative().max(FLAT_VALUE_MAX).brand<'FlatValue'>();
export type FlatValue = z.infer<typeof FlatValue>;

/** A signed result: one term's contribution or a whole roll's total. */
export const RollTotal = Pg.integer().brand<'RollTotal'>();
export type RollTotal = z.infer<typeof RollTotal>;

/** Expression text as typed. Any text is accepted here; the parser reports what is wrong with it. */
export const DiceExpressionText = z.string().brand<'DiceExpressionText'>();
export type DiceExpressionText = z.infer<typeof DiceExpressionText>;

/** A 1-based character position in expression text, for pointing at a mistake. */
export const TextPosition = Pg.smallint().positive().brand<'TextPosition'>();
export type TextPosition = z.infer<typeof TextPosition>;
