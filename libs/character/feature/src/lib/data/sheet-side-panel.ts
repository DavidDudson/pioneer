import { InjectionToken } from '@angular/core';
import type { Type } from '@angular/core';

/** Loads the component shown in the sheet's docked drawer. */
export type SheetSidePanelLoader = () => Promise<Type<unknown>>;

/**
 * The content search and reader beside the sheet. The character context may not import the content one, so the app
 * provides it (`SHEET_SIDE_PANEL`); without one the sheet has no side panel and the shell's search stays.
 */
export const SHEET_SIDE_PANEL = new InjectionToken<SheetSidePanelLoader | undefined>('SHEET_SIDE_PANEL', {
  factory: (): undefined => undefined,
});
