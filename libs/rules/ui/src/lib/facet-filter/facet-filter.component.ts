import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Disclosure, FilterChips, Grid, LocaleFormat, OptionalNumberInput, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { FacetCounts, FacetDefinition, FacetId, FacetValue, FilterState } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { FacetFilterMessage } from './facet-filter-messages';
import { FacetRowKind, facetRows, RangeSide, withBound, withValues } from './facet-filter-rows';
import type { ChipsRow, ChipValue, FacetRow } from './facet-filter-rows';

/** "Rarity", "Rarity: 2 picked" or "Level: limited". */
function summaryKeyOf(row: FacetRow): string {
  if (row.kind === FacetRowKind.Chips) {
    return row.selected.size === 0 ? FacetFilterMessage.Summary : FacetFilterMessage.SummaryPicked;
  }
  const open = row.min === undefined && row.max === undefined;
  return open ? FacetFilterMessage.Summary : FacetFilterMessage.SummaryBounded;
}

/**
 * Filters for a list of content, built from its facets (content-model.md, "Filters"): each facet is a row that
 * expands in place, with its values as chips (with how many entries each would leave) or a range's lowest and highest
 * bounds. OR within a facet, AND across. `state` is the filter state; each change replaces it. Values a link excludes
 * stay excluded: the panel picks values, it never excludes them.
 */
@Component({
  selector: 'pio-facet-filter',
  imports: [Disclosure, FilterChips, Grid, OptionalNumberInput, Stack, Text, TranslocoPipe],
  templateUrl: './facet-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacetFilterView {
  /** Each facet's value counts over the list, as `facetCounts` gives them. */
  public readonly counts = input.required<readonly FacetCounts[]>();
  public readonly state = model<FilterState>(new Map());

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Re-read when the messages load or the language changes, so a chip is never a raw key. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly Kind = FacetRowKind;
  protected readonly Side = RangeSide;
  protected readonly Message = FacetFilterMessage;
  protected readonly summaryKey = summaryKeyOf;

  protected readonly rows: Signal<readonly FacetRow[]> = computed(() => facetRows(this.counts(), this.state()));

  /** Each chip row's options, labelled in the UI locale: "Uncommon (12)". */
  protected readonly chipOptions: Signal<ReadonlyMap<FacetId, readonly SelectOption<FacetValue>[]>> = computed(() => {
    this.#messages();
    const chips = this.rows().filter((row): row is ChipsRow => row.kind === FacetRowKind.Chips);
    return new Map(chips.map((row) => [row.facet.id, row.values.map((chip) => this.#chipOption(chip))]));
  });

  protected pickedCount(row: FacetRow): string {
    return this.#format.number(row.kind === FacetRowKind.Chips ? row.selected.size : 0);
  }

  protected options(row: ChipsRow): readonly SelectOption<FacetValue>[] {
    return this.chipOptions().get(row.facet.id) ?? [];
  }

  protected number(value: number): string {
    return this.#format.number(value);
  }

  protected pick(facet: FacetDefinition, values: ReadonlySet<FacetValue>): void {
    this.state.set(withValues(this.state(), facet, values));
  }

  protected bound(facet: FacetDefinition, side: RangeSide, shown: number | undefined): void {
    this.state.set(withBound(this.state(), facet, { side, shown }));
  }

  #chipOption({ value, key, shown, count }: ChipValue): SelectOption<FacetValue> {
    const name = key === undefined ? shown : this.#i18n.translate(key);
    const label = this.#i18n.translate(FacetFilterMessage.Chip, {
      value: name,
      count: this.#format.number(count),
    });
    return { value, label };
  }
}
