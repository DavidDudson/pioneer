import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Grid } from '../../layout/grid/grid.component';
import { textVariants } from '../../text/text.variants';
import { DescriptionList } from '../description-list/description-list.component';

const termClasses = textVariants({ variant: 'label', tone: 'muted', class: 'break-words' });

/** May shrink below its content's width, so a long value wraps instead of widening the row. */
const valueClasses = cva('min-w-none')();

/**
 * One row of an `fr-description-list`: a `<dt>` for `term` and a `<dd>` for the projected value, which may be
 * anything (`fr-text`, `fr-inline-field`, `fr-disclosure`). The host takes no box and the row is an `fr-grid`
 * in parent mode, so the grid's `<div>` is the only element between the `<dl>` and the pair. Term and value
 * align on their first baseline.
 */
@Component({
  selector: 'fr-description-item',
  imports: [Grid],
  templateUrl: './description-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class DescriptionItem {
  public readonly term = input.required<string>();

  protected readonly list = inject(DescriptionList);
  protected readonly termClasses = termClasses;
  protected readonly valueClasses = valueClasses;
}
