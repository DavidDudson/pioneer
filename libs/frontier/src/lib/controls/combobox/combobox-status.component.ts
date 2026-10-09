import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text/text.component';
import { comboboxStatusClasses } from './combobox.variants';

/** Skeleton rows while a combobox's options load; "No matches" when none came back. */
@Component({
  selector: 'fr-combobox-status',
  imports: [Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './combobox-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ComboboxStatus {
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly empty = input(false, { transform: booleanAttribute });

  protected readonly classes = comboboxStatusClasses;
  protected readonly skeletonRows = [0, 1, 2] as const;
}
