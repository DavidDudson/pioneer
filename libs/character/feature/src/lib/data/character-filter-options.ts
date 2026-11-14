import { computed, inject, Injectable } from '@angular/core';
import { classPickerContent, originContent } from '@pioneer/character/domain';
import { ContentLoader } from '@pioneer/rules/data-access';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { CHARACTER_CONTENT_KINDS, contentRegistryQuery } from './content-registry-query';

/** One choice in a filter's list: a content id, as text for a select, and its name. */
export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

/** The classes and ancestries the list can be filtered by: every one of the loaded packs, by name. */
@Injectable({ providedIn: 'root' })
export class CharacterFilterOptions {
  readonly #content = inject(ContentLoader);
  readonly #registry = injectQuery(() => contentRegistryQuery(this.#content, CHARACTER_CONTENT_KINDS));

  /** Every loaded class, by name; none while the content loads. */
  public readonly classes = computed((): readonly FilterOption[] => {
    const registry = this.#registry.data();
    return registry === undefined
      ? []
      : classPickerContent(registry)
          .classes.map(({ id, name }): FilterOption => ({ value: id, label: name }))
          .toSorted((left, right) => left.label.localeCompare(right.label));
  });

  /** Every loaded ancestry, by name; none while the content loads. */
  public readonly ancestries = computed((): readonly FilterOption[] => {
    const registry = this.#registry.data();
    return registry === undefined
      ? []
      : originContent(registry)
          .ancestries.map(({ id, name }): FilterOption => ({ value: id, label: name }))
          .toSorted((left, right) => left.label.localeCompare(right.label));
  });
}
