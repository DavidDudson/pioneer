import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { cva, cx } from 'class-variance-authority';

import { Grid } from '../../layout/grid/grid.component';
import { textVariants } from '../../text/text.variants';
import { figureClasses, Space } from '../../tokens';
import { DescriptionList } from '../description-list/description-list.component';
import { rowVariants } from '../item/row';

const termClasses = textVariants({ variant: 'label', tone: 'muted', class: 'break-words' });

/**
 * May shrink below its content's width, so a long value wraps instead of widening the row. Figures are tabular and
 * lining, so a column of values lines up and a changing value does not shift its neighbours.
 */
const valueClasses = cva(['min-w-none', figureClasses])();

/**
 * One row of an `fr-description-list`: the host is its `listitem`, holding a `term` and a `definition` (the
 * projected value, which may be anything: `fr-text`, `fr-inline-field`, `fr-disclosure`). The row is an
 * `fr-grid` in parent mode, so its columns follow the list's width. Term and value align on their first
 * baseline. `padding` and `divided` are the row's, shared with `fr-list-item`.
 */
@Component({
  selector: 'fr-description-item',
  imports: [Grid],
  templateUrl: './description-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'listitem', '[class]': 'classes()' },
})
export class DescriptionItem {
  public readonly term = input.required<string>();
  public readonly padding = input<Space>(Space.None);
  /** Draws a rule under the row, except the last of its list. */
  public readonly divided = input(false, { transform: booleanAttribute });

  protected readonly list = inject(DescriptionList);
  protected readonly classes = computed(() =>
    cx('block', rowVariants({ padding: this.padding(), divided: this.divided() })),
  );
  protected readonly termClasses = termClasses;
  protected readonly valueClasses = valueClasses;
}
