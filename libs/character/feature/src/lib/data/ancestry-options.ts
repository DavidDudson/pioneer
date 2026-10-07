import { Injectable, resource } from '@angular/core';
import type { SelectOption } from '@pioneer/frontier';
import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';
import type { AncestryId } from '@pioneer/rules/sdk';

/** Ancestry choices from every content pack, loaded lazily on first use. */
@Injectable({ providedIn: 'root' })
export class AncestryOptions {
  readonly #registry = resource({
    loader: async () => {
      const registry = new ContentRegistry();
      await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
      return registry;
    },
  });

  public readonly options = (): readonly SelectOption<AncestryId>[] =>
    (this.#registry.value()?.ancestries() ?? [])
      .map((entry) => ({ value: entry.id, label: `${entry.definition.name} (${entry.pack.manifest.title})` }))
      .toSorted((left, right) => left.label.localeCompare(right.label));

  public name(id: AncestryId): string {
    return this.#registry.value()?.ancestry(id)?.definition.name ?? id;
  }
}
