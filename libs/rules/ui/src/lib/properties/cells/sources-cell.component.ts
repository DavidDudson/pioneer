import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SourceRef } from '@pioneer/rules/sdk';

import { SourceLineView } from '../../source-line/source-line.component';

/**
 * Where an entry comes from, as a property cell: the value is its sources.
 *
 * ```html
 * <pio-sources-cell [value]="row.sources" />
 * ```
 */
@Component({
  selector: 'pio-sources-cell',
  imports: [SourceLineView],
  templateUrl: './sources-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourcesCell {
  public readonly value = input.required<ReadonlyArray<SourceRef>>();
}
