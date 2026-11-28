import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  Button,
  ButtonVariant,
  Disclosure,
  injectTranslate,
  LocaleFormat,
  Stack,
  Text,
  ToggleGroup,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

import { FacetFilterMessage } from '../facet-filter/facet-filter-messages';
import { SpellListMessage } from '../spell-list/spell-list-messages';
import type { SpellFilterChange, SpellFilterGroup } from './spell-filter-line';

/** "Traits" when nothing is picked, "Traits: 2 picked" when something is. */
function summaryKeyOf(group: SpellFilterGroup): string {
  return group.selected.size === 0 ? FacetFilterMessage.Summary : FacetFilterMessage.SummaryPicked;
}

/**
 * The filters of a spell list (#1785): a row per property, each expanding in place to its values as chips, with how many
 * spells each would leave. A spell passes when it matches a pick in every property that has one. What is picked is listed
 * under the rows with a button that clears every pick at once.
 *
 * Presentational (ADR-0028): the caller works out the groups, keeps the picks (in the URL) and applies them.
 *
 * ```html
 * <pio-spell-filter [groups]="groups()" (changed)="pick($event)" (cleared)="clear()" />
 * ```
 */
@Component({
  selector: 'pio-spell-filter',
  imports: [Button, Disclosure, ToggleGroup, Stack, Text, TranslocoPipe],
  templateUrl: './spell-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellFilter {
  /** The properties to filter by; one with nothing to pick and nothing picked is left out. */
  public readonly groups = input.required<ReadonlyArray<SpellFilterGroup>>();

  /** The player toggled a value of a group. */
  public readonly changed = output<SpellFilterChange>();
  /** The player cleared every pick. */
  public readonly cleared = output();

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  /** Re-read when the messages load or the language changes, so a chip is never a raw key. */
  readonly #messages = injectTranslate();

  protected readonly Message = SpellListMessage;
  protected readonly summaryKey = summaryKeyOf;
  protected readonly clearVariant = ButtonVariant.Ghost;

  protected readonly shown: Signal<ReadonlyArray<SpellFilterGroup>> = computed(() =>
    this.groups().filter((group) => group.options.length > 0 || group.selected.size > 0),
  );

  /** Each group's chips, worded in the UI locale: "Single target (3)". */
  protected readonly options: Signal<ReadonlyMap<string, ReadonlyArray<SelectOption<string>>>> = computed(() => {
    this.#messages();

    return new Map(
      this.shown().map((group) => [
        group.id,
        group.options.map(({ value, label, count }) => ({
          value,
          label: this.#i18n.translate(FacetFilterMessage.Chip, { value: label, count: this.#format.number(count) }),
        })),
      ]),
    );
  });

  /** The labels of everything picked, in group order, for the line that lists the active filters. */
  protected readonly active: Signal<string> = computed(() =>
    this.shown()
      .flatMap((group) =>
        [...group.selected].map((value) => group.options.find((option) => option.value === value)?.label ?? value),
      )
      .join(', '),
  );

  protected optionsOf(group: SpellFilterGroup): ReadonlyArray<SelectOption<string>> {
    return this.options().get(group.id) ?? [];
  }

  protected count(group: SpellFilterGroup): string {
    return this.#format.number(group.selected.size);
  }

  protected pick(group: SpellFilterGroup, selected: ReadonlySet<string>): void {
    this.changed.emit({ group: group.id, selected });
  }
}
