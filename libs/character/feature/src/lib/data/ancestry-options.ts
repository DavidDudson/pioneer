import { computed, Injectable } from '@angular/core';
import type { SelectOption } from '@pioneer/frontier';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import type { AncestryId } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';

/** Ancestry choices from every content pack, loaded lazily on first use and kept for the session. */
@Injectable({ providedIn: 'root' })
export class AncestryOptions {
  readonly #registry = injectQuery(() => ({
    queryKey: ['content', 'registry'] as const,
    queryFn: async (): Promise<ContentRegistry> => {
      const registry = new ContentRegistry();
      await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
      return registry;
    },
    staleTime: Number.POSITIVE_INFINITY,
  }));

  public readonly options = computed<readonly SelectOption<AncestryId>[]>(() =>
    (this.#registry.data()?.ancestries() ?? [])
      .map((entry) => ({ value: entry.id, label: `${entry.definition.name} (${entry.pack.manifest.title})` }))
      .toSorted((left, right) => left.label.localeCompare(right.label)),
  );

  public name(id: AncestryId): string {
    return this.#registry.data()?.ancestry(id)?.definition.name ?? id;
  }
}
