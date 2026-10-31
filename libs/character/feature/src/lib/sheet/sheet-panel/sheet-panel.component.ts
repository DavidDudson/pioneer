import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { AsyncData, AsyncPending, AsyncRegion } from '@pioneer/frontier';
import { ENTRY_PREVIEWS, SkillsView } from '@pioneer/rules/ui';
import type { EntryPreviews } from '@pioneer/rules/ui';

import { SheetConditions } from '../sheet-conditions/sheet-conditions.component';
import { SheetEnvironments } from '../sheet-environments/sheet-environments.component';
import { SheetPanel as Panel } from '../sheet-sections';
import { SheetState } from '../sheet-state';

/**
 * The content of one side panel: the Skills, the Conditions or the Environments. Shown in the rail from `lg`, and as
 * the open entry of the section dropdown below it.
 */
@Component({
  selector: 'pio-sheet-panel',
  imports: [AsyncData, AsyncPending, AsyncRegion, SheetConditions, SheetEnvironments, SkillsView],
  templateUrl: './sheet-panel.component.html',
  providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(SheetState).previews }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPanelContent {
  public readonly panel = input.required<Panel>();

  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
  protected readonly Panel = Panel;
}
