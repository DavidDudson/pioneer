import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState, List, ListItem, Skeleton } from '@pioneer/frontier';

import type { ChoiceLine } from './choice-line';
import { ChoiceRow } from './choice-row/choice-row.component';
import { ChoicesMessage } from './choices-messages';

const LOADING_ROWS = 3;

/**
 * Every choice a character has, each with what is picked and a badge for its state, so a planned or broken choice
 * shows instead of vanishing. An invalid choice carries its reason beneath it.
 *
 * Read-only and presentational (ADR-0028): the caller turns the character's slots into lines, or passes undefined
 * while they load. Pickers are the builder's (#27).
 *
 * ```html
 * <pio-choices [lines]="choiceLines()" />
 * ```
 */
@Component({
  selector: 'pio-choices',
  imports: [ChoiceRow, EmptyState, List, ListItem, Skeleton, TranslocoPipe],
  templateUrl: './choices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoicesView {
  /** The choices in sheet order, or undefined while they load. */
  public readonly lines = input<readonly ChoiceLine[] | undefined>();

  protected readonly Message = ChoicesMessage;
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}
