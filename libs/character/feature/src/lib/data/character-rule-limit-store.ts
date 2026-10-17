import { computed, inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { CharacterContract, CORE_RULE_LIMITS } from '@pioneer/character/domain';
import type { RuleLimits } from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { CharacterStore } from './character-store';

/**
 * The table limits the open character's inventory is held to: its campaign's, else the core rules' (ADR-0064). Cached
 * by TanStack Query apart from the build, as a GM changing a limit never changes the character's version. Provided by
 * the sheet page.
 */
@Injectable()
export class CharacterRuleLimitStore {
  readonly #api = inject(ApiClient);
  readonly #characters = inject(CharacterStore);
  readonly #id = computed(() => this.#characters.selected()?.id);

  /** The open character's limits as the server worked them out. */
  public readonly query = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: ['characters', 'rule-limits', id],
      queryFn: async (): Promise<RuleLimits> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.ruleLimits, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** The limits in force; the core rules' until the server's arrive, so the sheet never waits on them. */
  public readonly limits: Signal<RuleLimits> = computed(() => this.query.data() ?? CORE_RULE_LIMITS);
}
