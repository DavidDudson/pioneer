import { computed, inject, Injectable } from '@angular/core';
import { classesForRole, classPickerContent } from '@pioneer/character/domain';
import type { ClassOption } from '@pioneer/character/domain';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ClassRole } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { contentRegistryQuery } from './content-registry-query';

/** The classes of every official pack, loaded on first use and kept for the session, for choosing one by role. */
@Injectable({ providedIn: 'root' })
export class ClassRoleOptions {
  readonly #content = inject(ContentLoader);
  readonly #registry = injectQuery(() => contentRegistryQuery(this.#content, [ContentKind.Class]));

  /** Every class, by name; none while the content loads. */
  public readonly classes = computed((): readonly ClassOption[] => {
    const registry = this.#registry.data();
    return registry === undefined ? [] : classPickerContent(registry).classes;
  });

  /** The classes that play `role`, by name. */
  public playing(role: ClassRole): readonly ClassOption[] {
    return classesForRole(this.classes(), role);
  }
}
