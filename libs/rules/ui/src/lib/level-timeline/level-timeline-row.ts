import type { Signal } from '@angular/core';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';
import type { ComboboxOption } from '@pioneer/frontier/data';
import type { Level, SlotKey } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { ChoiceLine } from '../choices/choice-line';

/** How a planned slot is picked: from a short list, or by searching a long one (feats). */
export const TimelinePickKind = {
  Select: 'select',
  Combobox: 'combobox',
} as const;
export type TimelinePickKind = ValueOf<typeof TimelinePickKind>;

interface TimelinePickBase {
  /** The slot it picks, matching a line of the row. */
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly field: InlineEdit<string | undefined>;
}

/** A planned slot picked from a short list of options. */
export interface TimelineSelect extends TimelinePickBase {
  readonly kind: typeof TimelinePickKind.Select;
  readonly options: Signal<readonly SelectOption<string>[]>;
}

/** A planned slot picked by searching: `matches` are the options for what was last typed into `search`. */
export interface TimelineCombobox extends TimelinePickBase {
  readonly kind: typeof TimelinePickKind.Combobox;
  readonly matches: Signal<readonly ComboboxOption<string>[]>;
  readonly search: (query: string) => void;
  /** Why the slot's pick counts for nothing, if it does. */
  readonly reason: Signal<MessageDescriptor | undefined>;
}

/** An inline pick for a slot of a row. */
export type TimelinePick = TimelineSelect | TimelineCombobox;

/** One level of the timeline: what it opens, each with what is picked, and whether it is the character's level. */
export interface LevelTimelineRow {
  readonly level: Level;
  /** The character's level, marked in text. */
  readonly current: boolean;
  readonly lines: readonly ChoiceLine[];
  /** A picker for each planned slot of the level that can be picked ahead of time. */
  readonly picks: readonly TimelinePick[];
}
