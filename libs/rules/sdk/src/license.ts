import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * Licence a pack's content is published under. Every pack must declare one;
 * see NOTICE.md for what each permits.
 */
export const ContentLicense = {
  /** ORC License: remastered game mechanics (Player Core, Monster Core, ...). */
  Orc: 'ORC',
  /** Paizo Community Use Policy: Paizo IP that is not ORC (setting, names, art). */
  PaizoCommunityUse: 'Paizo-CUP',
  /** Original homebrew content owned by its author. */
  Homebrew: 'homebrew',
} as const;
export type ContentLicense = ValueOf<typeof ContentLicense>;
export const ContentLicenseSchema = z.enum(ContentLicense);
