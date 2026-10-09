import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';

/** A row as shown: what it names, and the lines under it (the chain that led there, when it holds). */
export interface ShownRow {
  readonly title: string;
  readonly details: readonly string[];
}

/** One section of the grants result: its heading (projected) and its rows; nothing when it has no rows. */
@Component({
  selector: 'pio-grant-list',
  imports: [Heading, List, ListItem, Stack, Text],
  templateUrl: './grant-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrantList {
  public readonly rows = input.required<readonly ShownRow[]>();
}
