import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Stack } from '../../layout/stack/stack.component';
import { Space } from '../../tokens';
import { Text } from '../text/text.component';

/**
 * A figure with its caption above it: a score, a count, a total. The caption is the `label` (already translated);
 * the projected content is the value, set in tabular figures so a row of stats lines up.
 *
 * ```html
 * <fr-stat [label]="'character.sheet.armorClass' | transloco">{{ armorClass }}</fr-stat>
 * ```
 */
@Component({
  selector: 'fr-stat',
  imports: [Stack, Text],
  templateUrl: './stat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Stat {
  /** The caption, already translated. */
  public readonly label = input.required<string>();

  protected readonly gap = Space.Xs3;
}
