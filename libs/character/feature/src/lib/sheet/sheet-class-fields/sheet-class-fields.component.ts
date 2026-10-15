import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, InlineField } from '@pioneer/frontier';
import type { InlineEdit } from '@pioneer/frontier';
import { ClassPicker, KeyAttributePicker, SubclassPicker } from '@pioneer/rules/ui';

import type { BuildPicks, ClassPicks } from '../sheet-build-picks';
import { injectClassRows } from '../sheet-class-rows';
import { SheetState } from '../sheet-state';

/** The labels of the three pickers, as message keys spelled out in full. */
interface ClassLabels {
  readonly class: string;
  readonly subclass: string;
  readonly keyAttribute: string;
}

const FIRST_LABELS: ClassLabels = {
  class: 'character.sheet.class',
  subclass: 'character.sheet.subclass',
  keyAttribute: 'character.sheet.keyAttribute',
};

const SECOND_LABELS: ClassLabels = {
  class: 'character.sheet.secondClass',
  subclass: 'character.sheet.secondSubclass',
  keyAttribute: 'character.sheet.secondKeyAttribute',
};

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
  /** Whether these are the second class's pickers (Dual Class), not the first's. */
  public readonly second = input(false);

  protected readonly rows = injectClassRows(inject(SheetState), () => this.second());
  protected readonly classPicks = computed((): ClassPicks => (this.second() ? this.picks().second : this.picks()));
  protected readonly labels = computed((): ClassLabels => (this.second() ? SECOND_LABELS : FIRST_LABELS));
}
