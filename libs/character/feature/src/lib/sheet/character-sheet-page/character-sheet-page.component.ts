import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterId } from '@pioneer/character/domain';
import { DateDisplay, Grid, Page, PageBody, PageHeader, Skeleton, Stack, Tab, Tabs, Text } from '@pioneer/frontier';
import { VitalsView } from '@pioneer/rules/ui';

import { FeatDisplayStore } from '../../data/feat-display-store';
import { CHARACTER_CONTENT_PROVIDERS } from '../../data/source-packs';
import { SheetArmorClass } from '../sheet-armor-class/sheet-armor-class.component';
import { SheetCharacterBlock } from '../sheet-character-block/sheet-character-block.component';
import { SheetConfigurationState } from '../sheet-configuration/sheet-configuration-state';
import { SheetCounted } from '../sheet-counted/sheet-counted.component';
import { SheetDeathTrack } from '../sheet-death-track/sheet-death-track.component';
import { SheetDrawers } from '../sheet-drawers/sheet-drawers.component';
import { SheetFormPicker } from '../sheet-form-picker/sheet-form-picker.component';
import { SheetForm } from '../sheet-form/sheet-form.component';
import { SheetHeaderActions } from '../sheet-header-actions/sheet-header-actions.component';
import { SHEET_INLINE_ROLLS_PROVIDERS } from '../sheet-inline-rolls';
import { SheetLastRoll } from '../sheet-last-roll/sheet-last-roll.component';
import { SHEET_OVERRIDES_PROVIDERS } from '../sheet-override/sheet-override';
// oxlint-disable-next-line import/max-dependencies -- the page that gathers every region of the sheet, and its side panel
import { SheetPanels } from '../sheet-panels/sheet-panels.component';
import { SheetResources } from '../sheet-resources/sheet-resources.component';
import { SHEET_ROLLS_PROVIDERS } from '../sheet-rolls';
import { SHEET_TABS } from '../sheet-sections';
import { SheetSidePanelState } from '../sheet-side-panel/sheet-side-panel-state';
import { SheetSidePanelHost } from '../sheet-side-panel/sheet-side-panel.component';
import { SHEET_PLAY_PROVIDERS } from '../sheet-spender';
import { SheetState } from '../sheet-state';

/**
 * Character sheet: one character under four tabs (play-and-campaigns.md, Sheet modes), each its own route below the
 * character's. The header is the same on every tab: the character's name, a one-line identity, how its edits stand,
 * and the vitals row; then the tabs, then the open tab's sections. The character's own address opens the tab the user
 * last had open on it, Plan the first time.
 */
@Component({
  selector: 'pio-character-sheet-page',
  imports: [
    DateDisplay,
    Grid,
    Page,
    PageBody,
    PageHeader,
    RouterOutlet,
    SheetArmorClass,
    SheetCharacterBlock,
    SheetDeathTrack,
    SheetCounted,
    SheetForm,
    SheetFormPicker,
    SheetHeaderActions,
    SheetLastRoll,
    SheetPanels,
    SheetResources,
    SheetDrawers,
    SheetSidePanelHost,
    Skeleton,
    Stack,
    Tab,
    Tabs,
    Text,
    TranslocoPipe,
    VitalsView,
  ],
  templateUrl: './character-sheet-page.component.html',
  providers: [
    SheetConfigurationState,
    SheetSidePanelState,
    SheetState,
    ...SHEET_PLAY_PROVIDERS,
    FeatDisplayStore,
    ...CHARACTER_CONTENT_PROVIDERS,
    ...SHEET_ROLLS_PROVIDERS,
    ...SHEET_INLINE_ROLLS_PROVIDERS,
    ...SHEET_OVERRIDES_PROVIDERS,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetPage {
  /** Route param, bound by `withComponentInputBinding`. */
  public readonly id = input.required({ transform: (id: string): CharacterId => CharacterId.parse(id) });

  protected readonly sheet = inject(SheetState);
  protected readonly character = this.sheet.character;
  protected readonly tabs = SHEET_TABS;
  protected readonly title = computed(() => this.character()?.name);

  public constructor() {
    effect(() => {
      this.sheet.store.select(this.id());
    });
  }
}
