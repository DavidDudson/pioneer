import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideTable } from '@lucide/angular';
import { rollOn } from '@pioneer/character/domain';
import type { RollTable } from '@pioneer/character/domain';
import { Button, Icon, RefreshableField } from '@pioneer/frontier';

import { cryptoPicks } from './crypto-picks';

/**
 * A text field whose value is rolled on a roll table: it rolls when it appears, the refresh button rolls again, and
 * the table button opens the whole table in the page's `fr-drawer` (`[(tableOpen)]`), where a `pio-roll-table` lists it. The text can still
 * be typed over. Bind it with `[formField]`.
 */
@Component({
  selector: 'pio-roll-table-input',
  imports: [Button, Icon, RefreshableField, TranslocoPipe],
  templateUrl: './roll-table-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class RollTableInput implements FormValueControl<string> {
  public readonly table = input.required<RollTable>();
  /** The table's name, already translated: it names the table button and the drawer. */
  public readonly title = input.required<string>();
  public readonly label = input.required<string>();
  public readonly hint = input<string | undefined>(undefined);
  public readonly placeholder = input('');
  public readonly error = input<string | undefined>(undefined);
  /** Bound by signal forms through `[formField]`. */
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  public readonly touched = input(false, { transform: booleanAttribute });
  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly value = model('');
  /** Whether the table's drawer is open; the page that holds the drawer binds it. */
  public readonly tableOpen = model(false);

  protected readonly TableIcon = LucideTable;

  /** One roll on the table. */
  protected readonly roll = async (): Promise<string> => rollOn(cryptoPicks, this.table());
}
