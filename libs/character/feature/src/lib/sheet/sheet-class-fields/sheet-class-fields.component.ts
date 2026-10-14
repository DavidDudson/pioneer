import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, InlineField } from '@pioneer/frontier';
import type { InlineEdit } from '@pioneer/frontier';
import { ClassPicker, KeyAttributePicker, SubclassPicker } from '@pioneer/rules/ui';

import type { BuildPicks } from '../sheet-build-picks';
import { injectClassRows } from '../sheet-class-rows';
import { SheetState } from '../sheet-state';

/**
 * The class pickers on the sheet: the class, then the subclass and the key attribute when the class asks for them (a
 * fighter has no subclass, a cleric no key attribute to choose). Each is its own inline edit over a table.
 */
@Component({
  selector: 'pio-sheet-class-fields',
  imports: [ClassPicker, Grid, InlineField, KeyAttributePicker, SubclassPicker, TranslocoPipe],
  templateUrl: './sheet-class-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetClassFields {
  public readonly picks = input.required<BuildPicks>();
  public readonly classField = input.required<InlineEdit<string | undefined>>();

  protected readonly rows = injectClassRows(inject(SheetState));
}
