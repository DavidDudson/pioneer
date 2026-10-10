import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  DescriptionItem,
  DescriptionList,
  Heading,
  List,
  ListItem,
  LocaleFormat,
  Stack,
  Text,
} from '@pioneer/frontier';
import { FacetMessage, FacetType, FLAG_LABELS, UNKNOWN } from '@pioneer/rules/sdk';
import type { FacetCounts, FacetDefinition, FacetValue } from '@pioneer/rules/sdk';
import { SourceLineView } from '@pioneer/rules/ui';

import { FiltersStatus } from '../filters-check';
import type { FiltersCheck } from '../filters-check';
import { RulesResult } from '../rules-result/rules-result.component';

/**
 * A value as the result lists it: a message key for a closed set's value, else the value as shown (a range's as a
 * number in the UI locale, in its facet's unit: bulk's tenths as 0.1).
 */
interface ValueRow {
  readonly value: FacetValue;
  readonly shown: string;
  readonly key: string | undefined;
  readonly count: number;
}

interface FacetRow {
  readonly id: string;
  readonly label: string;
  readonly values: readonly ValueRow[];
}

function labelOf(facet: FacetDefinition, value: FacetValue): string | undefined {
  if (value === UNKNOWN) {
    return FacetMessage.Unknown;
  }
  return facet.type === FacetType.Flag ? FLAG_LABELS.get(value) : facet.values?.get(value);
}

function shownValue(format: LocaleFormat, facet: FacetDefinition, value: FacetValue): string {
  return facet.type === FacetType.Range ? format.number(Number(value) / (facet.scale ?? 1)) : value;
}

/** A facet's values, with a range's unknown count last since it isn't one of the listed values. */
function facetRow(format: LocaleFormat, { facet, values, unknown }: FacetCounts): FacetRow {
  const rows = values.map(({ value, count }) => ({
    value,
    shown: shownValue(format, facet, value),
    key: labelOf(facet, value),
    count,
  }));
  const unknownRow =
    facet.type === FacetType.Range && unknown > 0
      ? [{ value: UNKNOWN, shown: UNKNOWN, key: FacetMessage.Unknown, count: unknown }]
      : [];
  return { id: facet.id, label: facet.label, values: [...rows, ...unknownRow] };
}

/**
 * What the filters keep: how many entries of how many, the query as the URL would hold it, each facet's values with
 * the count picking that value alone would leave, then the entries kept. A list that doesn't read shows its problems.
 */
@Component({
  selector: 'pio-filters-result',
  imports: [
    DescriptionItem,
    DescriptionList,
    Heading,
    List,
    ListItem,
    RulesResult,
    SourceLineView,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './filters-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersResult {
  protected readonly FiltersStatus = FiltersStatus;
  public readonly check = input.required<FiltersCheck>();
  readonly #format = inject(LocaleFormat);

  protected readonly facets = computed((): readonly FacetRow[] => {
    this.#format.locale();
    const result = this.check();
    return result.status === FiltersStatus.Valid
      ? result.counts
          .filter((counts) => counts.values.length > 0 || counts.unknown > 0)
          .map((counts) => facetRow(this.#format, counts))
      : [];
  });
}
