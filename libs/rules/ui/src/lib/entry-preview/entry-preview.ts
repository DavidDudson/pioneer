import type { Provider } from '@angular/core';
import type { Params } from '@angular/router';
import { DRAWER_OPEN, DRAWER_PARAM } from '@pioneer/frontier';
import type { LinkTarget } from '@pioneer/frontier';
import type { EffectLine, SpellAtRank } from '@pioneer/rules/engine';
import { slugName } from '@pioneer/rules/sdk';
import type {
  ConditionEnding,
  ConditionValue,
  ConditionValues,
  ContentEntry,
  ContentId,
  ContentLevel,
  ContentText,
  EntrySlug,
  Level,
  RichText,
  Selector,
  SourceRef,
  SpellRank,
} from '@pioneer/rules/sdk';

import type { StatBlockCreature } from '../creature-stat-block/creature-stat-block';
import { ENTRY_PREVIEWS } from './entry-previews-token';

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

/** An entry the character has that eases a condition: a spell it knows, a feat it took, a consumable it carries. */
export interface PreviewEndingSource {
  readonly id: ContentId;
  readonly name: ContentText;
}

/** A statistic the character may roll to end a condition, with the modifier it rolls at. */
export interface PreviewEndingStatistic {
  readonly name: string;
  /** The statistic's total for the character now, conditions it holds included. */
  readonly modifier: number;
}

/** One way a condition the character has ends or eases, as that character meets it. */
export interface PreviewEnding {
  readonly kind: ConditionEnding['kind'];
  /** The rule text, as content gives it. */
  readonly text: RichText;
  /** The DC of a check at the value the character holds; absent for a flat or another creature's DC, or no check. */
  readonly dc?: number;
  /** Set when the DC adds the condition's value to its base, so the card can work it out at a value a mention names. */
  readonly dcByValue?: true;
  /** The statistics the character may roll for the check, as it has them; empty for a flat check or no check. */
  readonly against: readonly PreviewEndingStatistic[];
  /** The action that ends it, which anyone can take; absent where the ending names none. */
  readonly action?: PreviewEndingSource;
}

/** What an option does to the condition: ends it, lowers its value, or tries to counteract it. */
export const EaseEffect = {
  Remove: 'remove',
  Lower: 'lower',
  Counteract: 'counteract',
} as const;
export type EaseEffect = (typeof EaseEffect)[keyof typeof EaseEffect];

/** Something the character has that ends or eases a condition it holds, and whether it can use it now. */
export interface PreviewEaseOption {
  readonly source: PreviewEndingSource;
  readonly effect: EaseEffect;
  /** How many points a `lower` takes off. */
  readonly by?: number;
  /** The rank a `counteract` is made at, where the entry states one. */
  readonly rank?: SpellRank;
  /** Whether the character can use it now: a spell slot, a use or a stack left. */
  readonly available: boolean;
  /** How many uses, casts or items are left, where the entry is counted. */
  readonly left?: number;
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
  /** Set for a condition that carries a value, so a mention that names one (frightened 2) can show the card at it. */
  readonly valued?: true;
  /**
   * What the entry would do to the character, or is doing, with its value applied. Absent when the preview is not
   * for a character (the public browser); empty when it changes nothing.
   */
  readonly effects?: readonly PreviewEffect[];
  /** What each value of a valued condition means: its stages, or the rule that scales with the value. */
  readonly values?: ConditionValues;
  /** How a condition the character has ends or eases, with what the character has to do it. */
  readonly endings?: readonly PreviewEnding[];
  /** What the character has that ends or eases a condition it holds, with whether it can use it now. */
  readonly easeOptions?: readonly PreviewEaseOption[];
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

/** The query parameters of a page's side panel, beside the drawer's own `drawer`. */
export const SidePanelParam = {
  /** The words searched for. */
  Query: 'sq',
  /** The entry being read, as `kind:name`, which is the entry's slug. */
  Entry: 'se',
} as const;

/** Where an entry opens in the page's side panel: the page itself, with the query parameters that open the drawer on it. */
export interface PanelLink {
  readonly to: LinkTarget;
  readonly queryParams: Params;
}

/** The query parameters that open the side panel on `entry`. */
export function panelQuery(entry: ContentEntry): Params {
  return slugPanelQuery(entry.slug);
}

/** The query parameters that open the side panel on the entry `slug` names. */
export function slugPanelQuery(slug: EntrySlug): Params {
  return { [DRAWER_PARAM]: DRAWER_OPEN, [SidePanelParam.Entry]: slug };
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
  /** Where the entry opens in the page's side panel; none when the page has no panel loaded. */
  readonly panel?: (id: ContentId) => PanelLink | undefined;
  /** Where the statistic entry `slug` names opens in the page's side panel, for a skill's name; none when the page has no panel loaded. */
  readonly statisticPanel?: (slug: EntrySlug) => PanelLink | undefined;
  /**
   * Where the breakdown of the statistic `selector` opens, for the name in an effect line; none when the page shows
   * no breakdown, and the name is then plain text.
   */
  readonly statistic?: (selector: Selector) => StatisticLink | undefined;
}

export { ENTRY_PREVIEWS } from './entry-previews-token';

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
