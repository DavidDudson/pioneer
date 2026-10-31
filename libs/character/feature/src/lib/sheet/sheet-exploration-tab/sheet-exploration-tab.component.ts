import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DEITY_SLOT, SheetMode } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Section, Stack } from '@pioneer/frontier';
import { ActionMode } from '@pioneer/rules/sdk';
import { DeityView } from '@pioneer/rules/ui';

import { InventorySection } from '../inventory/inventory-section/inventory-section.component';
import { SheetActions } from '../sheet-actions/sheet-actions.component';
import { SheetDeitySection } from '../sheet-deity-section/sheet-deity-section.component';
import { SheetEnvironments } from '../sheet-environments/sheet-environments.component';
import { SheetExplorationActivity } from '../sheet-exploration-activity/sheet-exploration-activity.component';
import { SheetLanguagesSection } from '../sheet-languages-section/sheet-languages-section.component';
import { SheetRoleplaySection } from '../sheet-roleplay-section/sheet-roleplay-section.component';
import { SheetSectionTabs } from '../sheet-section-tabs/sheet-section-tabs.component';
import { SHEET_SECTIONS, SHEET_TAB_SECTIONS, shownSection } from '../sheet-sections';
import { SheetState } from '../sheet-state';
import { rememberTab } from '../sheet-tab';

/**
 * The Exploration tab: who the character is at the table. Its appearance and personality, the deity with edicts and
 * anathema, the languages it knows, and its inventory. Exploration activities join as their story lands.
 */
@Component({
  selector: 'pio-sheet-exploration-tab',
  imports: [
    SheetSectionTabs,
    SheetActions,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DeityView,
    InventorySection,
    Section,
    SheetDeitySection,
    SheetEnvironments,
    SheetExplorationActivity,
    SheetLanguagesSection,
    SheetRoleplaySection,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './sheet-exploration-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetExplorationTab {
  protected readonly sheet = inject(SheetState);
  protected readonly sections = SHEET_SECTIONS;
  protected readonly Mode = ActionMode.Exploration;
  /** The section the route names, bound from the route's `:section` parameter. */
  public readonly section = input<string>();
  protected readonly sectionOrder = SHEET_TAB_SECTIONS[SheetMode.Exploration];
  protected readonly shown = shownSection(this.sectionOrder, this.section);
  protected readonly deityOptions = this.sheet.picks.rootOptions(DEITY_SLOT);
  protected readonly deity = this.sheet.picks.rootField(DEITY_SLOT, this.deityOptions);

  public constructor() {
    rememberTab(SheetMode.Exploration);
  }
}
