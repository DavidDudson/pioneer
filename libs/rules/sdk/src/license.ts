import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * Licence a pack's content is published under. Every pack must declare one;
 * see NOTICE.md for what each permits.
 */
export const ContentLicense = {
  /** ORC License: remastered game mechanics (Player Core, Monster Core, ...). */
  Orc: 'ORC',
  /** Open Game License 1.0a: pre-remaster books imported for the content remaster books still point at. */
  Ogl: 'OGL',
  /** Paizo Community Use Policy: Paizo IP that is not ORC (setting, names, art). */
  PaizoCommunityUse: 'Paizo-CUP',
  /** Original homebrew content owned by its author. */
  Homebrew: 'homebrew',
} as const;
export type ContentLicense = ValueOf<typeof ContentLicense>;
export const ContentLicenseSchema = z.enum(ContentLicense);

/** The licence an entry is published under: its own when it carries one, else its pack's. */
export function effectiveLicense(
  entry: { readonly license?: ContentLicense | undefined },
  pack: { readonly license: ContentLicense },
): ContentLicense {
  return entry.license ?? pack.license;
}

/** Open Game License content is pre-remaster, so legacy; every entry under it is, whatever pack carries it. */
export function isLegacyLicense(license: ContentLicense): boolean {
  return license === ContentLicense.Ogl;
}
