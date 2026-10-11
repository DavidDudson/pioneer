import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, InlineField, Select } from '@pioneer/frontier';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';

import type { BuildPicks } from '../sheet-build-picks';

/**
 * The class pickers on the sheet: the class, then the subclass and the key attribute when the class asks for them (a
 * fighter has no subclass, a cleric no key attribute to choose). Each is its own inline edit.
 */
@Component({
  selector: 'pio-sheet-class-fields',
  imports: [Grid, InlineField, Select, TranslocoPipe],
  templateUrl: './sheet-class-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetClassFields {
  public readonly picks = input.required<BuildPicks>();
  public readonly classField = input.required<InlineEdit<string | undefined>>();
  public readonly classOptions = input.required<readonly SelectOption<string>[]>();
}
