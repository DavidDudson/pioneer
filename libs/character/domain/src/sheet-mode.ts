import { Uuid } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * The sheet's four tabs over one character (play-and-campaigns.md, Sheet modes): Plan is who the character is
 * mechanically, Encounter what it does in a fight, Exploration who it is at the table, Downtime what it does between
 * adventures.
 */
export const SheetMode = {
  Plan: 'plan',
  Encounter: 'encounter',
  Exploration: 'exploration',
  Downtime: 'downtime',
} as const;
export type SheetMode = ValueOf<typeof SheetMode>;

/** A remembered tab's own row id, for the audit trail. */
export const SheetModeId = Uuid.brand<'SheetModeId'>();
export type SheetModeId = z.infer<typeof SheetModeId>;

export const SheetModeSchema = z.enum(SheetMode);

/** The tab a character's sheet opens on until its user picks one. */
export const DEFAULT_SHEET_MODE: SheetMode = SheetMode.Plan;

/**
 * The tab a user last had open on a character's sheet: a display preference (ADR-0052), absent until they first
 * switch tabs.
 */
export const SheetModeChoice = z.strictObject({ mode: SheetModeSchema.optional() });
export type SheetModeChoice = z.output<typeof SheetModeChoice>;

/** A switch to `mode`; a choice is changed, never removed (ADR-0052). */
export const SetSheetModeBody = z.strictObject({ mode: SheetModeSchema });
export type SetSheetModeBody = z.output<typeof SetSheetModeBody>;
