import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';

import { Segmented } from '../../../controls/segmented/segmented.component';
import type { SelectOption } from '../../../controls/select/select.component';
import { injectTranslate } from '../../../locale/inject-translate';
import { TableDensity } from '../../table-view/table-view-store';

const DensityMessage = {
  Label: 'frontier.table.density.label',
  Compact: 'frontier.table.density.compact',
  Comfortable: 'frontier.table.density.comfortable',
} as const;

/**
 * The *Density* switch of a table: compact or comfortable rows. Presentational; `fr-table` shows it when it is
 * given `showDensity`, and a page keeps the choice with `injectTableView`.
 *
 * ```html
 * <fr-table-density [(value)]="density" />
 * ```
 */
@Component({
  selector: 'fr-table-density',
  imports: [Segmented],
  templateUrl: './table-density.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TableDensityControl {
  public readonly value = model<TableDensity>(TableDensity.Comfortable);

  readonly #translate = injectTranslate();

  protected readonly label = computed(() => this.#translate()(DensityMessage.Label));

  protected readonly options = computed<ReadonlyArray<SelectOption<TableDensity>>>(() => {
    const translate = this.#translate();

    return [
      { value: TableDensity.Comfortable, label: translate(DensityMessage.Comfortable) },
      { value: TableDensity.Compact, label: translate(DensityMessage.Compact) },
    ];
  });
}
