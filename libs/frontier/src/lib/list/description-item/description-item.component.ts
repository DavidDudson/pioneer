import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Grid } from '../../layout/grid/grid.component';
import { textVariants } from '../../text/text.variants';
import { DescriptionList } from '../description-list/description-list.component';

const termClasses = textVariants({ variant: 'label', tone: 'muted', class: 'break-words' });

/** May shrink below its content's width, so a long value wraps instead of widening the row. */
const valueClasses = cva('min-w-none')();

/**
 * One row of an `fr-description-list`: the host is its `listitem`, holding a `term` and a `definition` (the
 * projected value, which may be anything: `fr-text`, `fr-inline-field`, `fr-disclosure`). The row is an
 * `fr-grid` in parent mode, so its columns follow the list's width. Term and value align on their first
 * baseline.
 */
@Component({
  selector: 'fr-description-item',
  imports: [Grid],
  templateUrl: './description-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'listitem', class: 'block' },
})
export class DescriptionItem {
  public readonly term = input.required<string>();

  protected readonly list = inject(DescriptionList);
  protected readonly termClasses = termClasses;
  protected readonly valueClasses = valueClasses;
}
