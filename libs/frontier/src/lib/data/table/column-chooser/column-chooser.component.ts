import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../../actions/button/button.component';
import { ToggleButton } from '../../../controls/toggle-button/toggle-button.component';
import { Disclosure } from '../../../layout/disclosure/disclosure.component';
import { Text } from '../../../text/text/text.component';
import { Size } from '../../../tokens';

/** A column the chooser lists. */
export interface ColumnToggle {
  readonly id: string;
  /** Already translated. */
  readonly label: string;
  readonly visible: boolean;
  /** The one column left shown: pressing it would empty the table. */
  readonly locked: boolean;
}

/** A press of a column's toggle: show or hide it. */
export interface ColumnChoice {
  readonly id: string;
  readonly visible: boolean;
}

const listClasses = cva('flex flex-wrap items-center gap-xs')();

/** The *Columns* panel above a table: one toggle per hideable column, and a reset. Expands in place. */
@Component({
  selector: 'fr-column-chooser',
  imports: [Button, Disclosure, Text, ToggleButton, TranslocoPipe],
  templateUrl: './column-chooser.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ColumnChooser {
  public readonly columns = input.required<readonly ColumnToggle[]>();
  /** Nothing to reset: the columns are as the schema left them. */
  public readonly atDefault = input(false, { transform: booleanAttribute });
  public readonly chosen = output<ColumnChoice>();
  public readonly defaulted = output();

  protected readonly listClasses = listClasses;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly Size = Size;
}
