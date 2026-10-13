import type { Signal } from '@angular/core';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';
import type { Level, SlotKey } from '@pioneer/rules/sdk';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { ChoiceLine } from '../choices/choice-line';
import type { FeatPickerRow } from '../feat-picker/feat-picker-row';

/** How a planned slot is picked: from a short list, or from a table of feats. */
export const TimelinePickKind = {
  Select: 'select',
  Feat: 'feat',
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

/** A planned slot picked from a table of the feats it will offer. */
export interface TimelineFeat extends TimelinePickBase {
  readonly kind: typeof TimelinePickKind.Feat;
  readonly rows: Signal<readonly FeatPickerRow[]>;
  /** Why the slot's pick counts for nothing, if it does. */
  readonly reason: Signal<MessageDescriptor | undefined>;
}

/** An inline pick for a slot of a row. */
export type TimelinePick = TimelineSelect | TimelineFeat;

/** One level of the timeline: what it opens, each with what is picked, and whether it is the character's level. */
export interface LevelTimelineRow {
  readonly level: Level;
  /** The character's level, marked in text. */
  readonly current: boolean;
  readonly lines: readonly ChoiceLine[];
  /** A picker for each planned slot of the level that can be picked ahead of time. */
  readonly picks: readonly TimelinePick[];
}
