import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Stack } from '../../layout/stack/stack.component';
import { Text } from '../../text/text/text.component';

/**
 * The middle part of an `fr-list-item`: a title and an optional byline, then whatever is projected (a badge, a
 * line of detail). It takes the row's spare width and may shrink below its content, so a long title wraps.
 * `loading` shows skeleton lines in place of the text.
 */
@Component({
  selector: 'fr-item-content',
  imports: [Skeleton, Stack, Text],
  templateUrl: './item-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-none flex-1' },
})
export class ItemContent {
  public readonly heading = input<string | undefined>(undefined);
  public readonly byline = input<string | undefined>(undefined);
  public readonly loading = input(false, { transform: booleanAttribute });
}
