import { computed, inject, Injectable } from '@angular/core';
import { ContentLoader } from '@pioneer/rules/data-access';
import { AncestryId } from '@pioneer/rules/sdk';
import type { AncestryPickerRow } from '@pioneer/rules/ui';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { CHARACTER_CONTENT_KINDS, contentRegistryQuery } from './content-registry-query';
import { ancestryRows } from './origin-rows';

/** Ancestries from every official pack, loaded on first use and kept for the session. */
@Injectable({ providedIn: 'root' })
export class AncestryOptions {
  readonly #content = inject(ContentLoader);
  readonly #registry = injectQuery(() => contentRegistryQuery(this.#content, CHARACTER_CONTENT_KINDS));

  /** Every loaded ancestry with the facts to choose by, by name; none while the content loads. */
  public readonly rows = computed((): readonly AncestryPickerRow[] => {
    const registry = this.#registry.data();
    return registry === undefined ? [] : ancestryRows(registry, undefined);
  });

  /** The content is still loading, so no ancestry is on offer yet. */
  public readonly loading = computed(() => this.#registry.data() === undefined);

  /** The ancestry's name, its id while content loads, or empty while the ancestry slot is unpicked. */
  public name(id: string | undefined): string {
    if (id === undefined) {
      return '';
    }
    const ancestry = AncestryId.safeParse(id);
    return (ancestry.success ? this.#registry.data()?.ancestry(ancestry.data)?.definition.name : undefined) ?? id;
  }
}
