import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DEITY_SLOT, SheetMode } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Section, SectionIndex, SectionLink, Stack } from '@pioneer/frontier';
import { DeityView } from '@pioneer/rules/ui';

import { InventorySection } from '../inventory/inventory-section/inventory-section.component';
import { SheetDeitySection } from '../sheet-deity-section/sheet-deity-section.component';
import { SheetLanguagesSection } from '../sheet-languages-section/sheet-languages-section.component';
import { SHEET_SECTIONS, SHEET_TAB_SECTIONS } from '../sheet-sections';
import { SheetState } from '../sheet-state';
import { rememberTab } from '../sheet-tab';

/**
 * The Exploration tab: who the character is at the table. Its deity with edicts and anathema, the languages it knows,
 * and its inventory. Appearance, personality and exploration activities join as their stories land.
 */
@Component({
  selector: 'pio-sheet-exploration-tab',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DeityView,
    InventorySection,
    Section,
    SectionIndex,
    SectionLink,
    SheetDeitySection,
    SheetLanguagesSection,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './sheet-exploration-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetExplorationTab {
  protected readonly sheet = inject(SheetState);
  protected readonly sections = SHEET_SECTIONS;
  protected readonly sectionOrder = SHEET_TAB_SECTIONS[SheetMode.Exploration];
  protected readonly deityOptions = this.sheet.picks.rootOptions(DEITY_SLOT);
  protected readonly deity = this.sheet.picks.rootField(DEITY_SLOT, this.deityOptions);

  public constructor() {
    rememberTab(SheetMode.Exploration);
  }
}
