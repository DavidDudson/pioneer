import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LocaleFormat } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { AncestryId } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { filter, merge } from 'rxjs';

import { contentRegistryQuery } from './content-registry-query';

/** Ancestry choices from every content pack, loaded lazily on first use and kept for the session. */
@Injectable({ providedIn: 'root' })
export class AncestryOptions {
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or a message scope (e.g. `character`) finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));
  readonly #registry = injectQuery(contentRegistryQuery);

  public readonly options = computed<readonly SelectOption<AncestryId>[]>(() => {
    // Re-run when messages change, not only when packs load.
    this.#messages();
    return (this.#registry.data()?.ancestries() ?? [])
      .map((entry) => ({
        value: entry.id,
        label: this.#i18n.translate('character.ancestryOption', {
          name: entry.definition.name,
          pack: entry.pack.manifest.title,
        }),
      }))
      .toSorted((left, right) => this.#format.compare(left.label, right.label));
  });

  public name(id: AncestryId): string {
    return this.#registry.data()?.ancestry(id)?.definition.name ?? id;
  }
}
