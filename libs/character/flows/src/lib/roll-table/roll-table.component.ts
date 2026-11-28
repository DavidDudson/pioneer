import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RollTable as RollTableData } from '@pioneer/character/domain';
import { List, ListItem } from '@pioneer/frontier';

/**
 * The whole of a roll table, one numbered line per roll. Put it in the page's `fr-drawer`, which
 * `pio-roll-table-input` opens through its `[(tableOpen)]`.
 */
@Component({
  selector: 'pio-roll-table',
  imports: [List, ListItem],
  templateUrl: './roll-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollTable {
  public readonly table = input.required<RollTableData>();
}
