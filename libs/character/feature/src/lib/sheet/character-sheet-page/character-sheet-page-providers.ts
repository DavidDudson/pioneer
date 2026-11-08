import { CHARACTER_CONTENT_PROVIDERS } from '../../data/source-packs';
import { SheetConfigurationState } from '../sheet-configuration/sheet-configuration-state';
import { SHEET_INLINE_ROLLS_PROVIDERS } from '../sheet-inline-rolls';
import { SHEET_OVERRIDES_PROVIDERS } from '../sheet-override/sheet-override';
import { SHEET_ROLLS_PROVIDERS } from '../sheet-rolls';
import { SheetSidePanelState } from '../sheet-side-panel/sheet-side-panel-state';
import { SHEET_PLAY_PROVIDERS } from '../sheet-spender';
import { SheetState } from '../sheet-state';

/** What the sheet page provides to every region below it. */
export const CHARACTER_SHEET_PAGE_PROVIDERS = [
  SheetConfigurationState,
  SheetSidePanelState,
  SheetState,
  ...SHEET_PLAY_PROVIDERS,
  ...CHARACTER_CONTENT_PROVIDERS,
  ...SHEET_ROLLS_PROVIDERS,
  ...SHEET_INLINE_ROLLS_PROVIDERS,
  ...SHEET_OVERRIDES_PROVIDERS,
];
