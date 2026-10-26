import { InjectionToken } from '@angular/core';
import type { Provider } from '@angular/core';
import type { Params } from '@angular/router';
import type { LinkTarget } from '@pioneer/frontier';
import type { EffectLine, SpellAtRank } from '@pioneer/rules/engine';
import { slugName } from '@pioneer/rules/sdk';
import type {
  ConditionValue,
  ContentEntry,
  ContentId,
  ContentLevel,
  ContentText,
  Level,
  RichText,
  Selector,
  SourceRef,
  SpellRank,
} from '@pioneer/rules/sdk';

import type { StatBlockCreature } from '../creature-stat-block/creature-stat-block';

/** One effect an entry has on the character the preview is for, as the engine summarises it. */
export interface PreviewEffect {
  /** The name of the statistic the line changes ("Perception"); undefined for a line that changes none (a sense). */
  readonly statistic: string | undefined;
  readonly line: EffectLine;
  /** The sense's name ("Darkvision") on a sense line; the view shows the id when the caller has no name. */
  readonly sense?: string;
  /** The names of the traits a weakness or resistance makes exceptions for, in the line's order. */
  readonly exceptions?: readonly string[];
}

/** A spell across the ranks it can be cast at: the card offers a pick and shows the spell as cast at that rank. */
export interface PreviewRanks {
  /** The spell's own rank, which the card starts at and the picker starts from. */
  readonly from: SpellRank;
  /** The spell cast at `rank`, heightening applied. */
  readonly cast: (rank: SpellRank) => SpellAtRank;
  /**
   * What the spell would do to the character cast at `rank`; absent when the preview is not for a character, as
   * `effects` is.
   */
  readonly effects?: (rank: SpellRank) => readonly PreviewEffect[];
}

/** What a preview shows of an entry: enough to recognise it without leaving the page. */
export interface EntryPreview {
  readonly name: ContentText;
  /** An item's or feat's level; a creature's is a character-level brand. */
  readonly level: ContentLevel | Level | undefined;
  /** Trait names as content gives them. */
  readonly traits: readonly string[];
  /** The start of the entry's description, clamped by the preview. */
  readonly summary: RichText;
  readonly sources: readonly SourceRef[];
  /** The value of a valued condition the character has (frightened 2), shown beside the name. */
  readonly value?: ConditionValue;
  /**
   * What the entry would do to the character, or is doing, with its value applied. Absent when the preview is not
   * for a character (the public browser); empty when it changes nothing.
   */
  readonly effects?: readonly PreviewEffect[];
  /** A spell's ranks, shown as a pick of the rank to cast it at in place of `effects`. */
  readonly ranks?: PreviewRanks;
  /** A creature's stat block, shown in place of the generic card. */
  readonly creature?: StatBlockCreature;
}

/** Where a statistic's breakdown opens: a router target and the query parameters that select it. */
export interface StatisticLink {
  readonly to: LinkTarget;
  readonly queryParams?: Params;
}

/** How a preview finds an entry. The page that shows it knows which content is loaded, so it provides this. */
export interface EntryPreviews {
  /** The entry's preview, or `undefined` when it isn't loaded (its reference then shows without one). */
  readonly preview: (id: ContentId) => EntryPreview | undefined;
  /**
   * Fetches the preview of an entry `preview` doesn't hold, when its card first opens. Resolves `undefined` for an
   * entry that doesn't exist and rejects when the fetch fails. A page that holds all it previews leaves it out; with
   * it, every reference is previewable, and the card shows a skeleton until the fetch settles.
   */
  readonly load?: (id: ContentId) => Promise<EntryPreview | undefined>;
  /** Where the entry opens in full (its page or panel), for the card's link; none when the page can't open it. */
  readonly target?: (id: ContentId) => LinkTarget | undefined;
  /**
   * Where the breakdown of the statistic `selector` opens, for the name in an effect line; none when the page shows
   * no breakdown, and the name is then plain text.
   */
  readonly statistic?: (selector: Selector) => StatisticLink | undefined;
}

const NO_PREVIEWS: EntryPreviews = { preview: (): undefined => undefined };

export const ENTRY_PREVIEWS = new InjectionToken<EntryPreviews>('ENTRY_PREVIEWS', {
  factory: (): EntryPreviews => NO_PREVIEWS,
});

/** Gives the references and rows below a page their previews. */
export function provideEntryPreviews(previews: EntryPreviews): Provider {
  return { provide: ENTRY_PREVIEWS, useValue: previews };
}

/** Whether `previews` can show a card for `id`: it holds the entry, or can fetch it when the card opens. */
export function canPreview(previews: EntryPreviews, id: ContentId): boolean {
  return previews.load !== undefined || previews.preview(id) !== undefined;
}

/** The root of the content browser's routes in the app. */
const CONTENT_PATH = '/content';

/** Where `entry` opens in full: `/content/feat/power-attack`. */
export function entryTarget(entry: ContentEntry): LinkTarget {
  return [CONTENT_PATH, entry.kind, slugName(entry.slug)];
}
