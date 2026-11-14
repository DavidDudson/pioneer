import { computed, inject, Injectable } from '@angular/core';
import { originContent } from '@pioneer/character/domain';
import { ContentLoader } from '@pioneer/rules/data-access';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { CHARACTER_CONTENT_KINDS, contentRegistryQuery } from './content-registry-query';

/** An ancestry or background to choose by name. */
export interface OriginChoice {
  readonly id: string;
  readonly name: string;
}

/** The ancestries and backgrounds of every official pack, by name, for choosing one before a character exists. */
@Injectable({ providedIn: 'root' })
export class OriginChoiceOptions {
  readonly #content = inject(ContentLoader);
  readonly #registry = injectQuery(() => contentRegistryQuery(this.#content, CHARACTER_CONTENT_KINDS));

  /** Every ancestry; none while the content loads. */
  public readonly ancestries = computed((): readonly OriginChoice[] => {
    const registry = this.#registry.data();
    return registry === undefined
      ? []
      : originContent(registry).ancestries.map(({ id, name }) => ({ id, name: String(name) }));
  });

  /** Every background; none while the content loads. */
  public readonly backgrounds = computed((): readonly OriginChoice[] => {
    const registry = this.#registry.data();
    return registry === undefined
      ? []
      : originContent(registry).backgrounds.map(({ id, name }) => ({ id, name: String(name) }));
  });
}
