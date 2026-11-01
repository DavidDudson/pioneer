import { InjectionToken } from '@angular/core';
import type { Signal } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

export const TabsAppearance = {
  /** A row with a rule under it; the current tab is underlined. */
  Underline: 'underline',
  /** The look of `fr-segmented`: a track of buttons, the current one filled with the accent. */
  Segment: 'segment',
} as const;
export type TabsAppearance = ValueOf<typeof TabsAppearance>;

export const TabsOrientation = {
  /** A row of tabs; the row scrolls sideways when they do not fit. */
  Horizontal: 'horizontal',
  /** A column of tabs beside the content. */
  Vertical: 'vertical',
} as const;
export type TabsOrientation = ValueOf<typeof TabsOrientation>;

/** How the `fr-tabs` around a tab looks, so its tabs take the same appearance. */
export const TABS_APPEARANCE = new InjectionToken<Signal<TabsAppearance>>('TABS_APPEARANCE');
