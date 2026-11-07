import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterId } from '@pioneer/character/domain';
import { DateDisplay, Page, PageBody, PageHeader, Skeleton, Stack, Tab, Tabs, Text } from '@pioneer/frontier';

import { SheetDrawers } from '../sheet-drawers/sheet-drawers.component';
import { SheetFormPicker } from '../sheet-form-picker/sheet-form-picker.component';
import { SheetForm } from '../sheet-form/sheet-form.component';
import { SheetHeaderActions } from '../sheet-header-actions/sheet-header-actions.component';
import { SheetHeaderRow } from '../sheet-header-row/sheet-header-row.component';
import { SheetLastRoll } from '../sheet-last-roll/sheet-last-roll.component';
import { SheetPanels } from '../sheet-panels/sheet-panels.component';
import { SHEET_TABS } from '../sheet-sections';
import { SheetSidePanelHost } from '../sheet-side-panel/sheet-side-panel.component';
import { SheetState } from '../sheet-state';
import { CHARACTER_SHEET_PAGE_PROVIDERS } from './character-sheet-page-providers';

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
    Page,
    PageBody,
    PageHeader,
    RouterOutlet,
    SheetDrawers,
    SheetForm,
    SheetFormPicker,
    SheetHeaderActions,
    SheetHeaderRow,
    SheetLastRoll,
    SheetPanels,
    SheetSidePanelHost,
    Skeleton,
    Stack,
    Tab,
    Tabs,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './character-sheet-page.component.html',
  providers: CHARACTER_SHEET_PAGE_PROVIDERS,
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
