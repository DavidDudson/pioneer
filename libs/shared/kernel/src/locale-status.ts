import { Locale } from './locale';
import type { ValueOf } from './value-of';

/** How far a locale's catalogs can be trusted (ADR-0084). */
export const LocaleStatus = {
  /** The language messages are authored in; every other locale falls back to it. */
  Source: 'source',
  /** Drafted by a machine and not yet read by a native speaker; the language picker says so. */
  MachineDraft: 'machine-draft',
  /** A native speaker reviewed it, named in the pull request that set this status. */
  Reviewed: 'reviewed',
} as const;

export type LocaleStatus = ValueOf<typeof LocaleStatus>;

/** The status of every locale Pioneer ships. The per-locale checks and the language picker read it. */
export const LOCALE_STATUS: Readonly<Record<Locale, LocaleStatus>> = {
  [Locale.English]: LocaleStatus.Source,
};
