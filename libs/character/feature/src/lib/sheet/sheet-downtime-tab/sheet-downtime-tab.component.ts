import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SheetMode } from '@pioneer/character/domain';
import { Section, SectionIndex, SectionLink, Stack } from '@pioneer/frontier';
import { ActionMode } from '@pioneer/rules/sdk';

import { SheetActions } from '../sheet-actions/sheet-actions.component';
import { SheetRest } from '../sheet-rest/sheet-rest.component';
import { SHEET_SECTIONS, SHEET_TAB_SECTIONS } from '../sheet-sections';
import { rememberTab } from '../sheet-tab';
import { Shop } from '../shop/shop.component';

/**
 * The Downtime tab: what the character does between adventures. Rest and the other restoring actions, and the shop;
 * rituals, crafting, Earn Income and retraining join as their stories land.
 */
@Component({
  selector: 'pio-sheet-downtime-tab',
  imports: [SheetActions, Section, SectionIndex, SectionLink, SheetRest, Shop, Stack, TranslocoPipe],
  templateUrl: './sheet-downtime-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetDowntimeTab {
  protected readonly sections = SHEET_SECTIONS;
  protected readonly Mode = ActionMode.Downtime;
  protected readonly sectionOrder = SHEET_TAB_SECTIONS[SheetMode.Downtime];

  public constructor() {
    rememberTab(SheetMode.Downtime);
  }
}
