import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterId, CharacterVariantRules } from '@pioneer/character/domain';
import type { VariantRuleId } from '@pioneer/rules/sdk';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { CharacterStore } from './character-store';

/** TanStack Query key for the variant rules a character uses. */
function variantRulesKey(id: CharacterId | undefined): readonly unknown[] {
  return ['characters', 'variant-rules', id];
}

/**
 * The variant rules the open character uses, cached by TanStack Query apart from the build: enabling one never changes
 * the character's version. Who decides them (the owner, or the campaign the character is in) comes with the list. The
 * sheet's registry is built over the enabled ones (`injectContentRegistry`). Provided by the sheet page.
 */
@Injectable()
export class CharacterVariantStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #characters = inject(CharacterStore);
  readonly #id = computed(() => this.#characters.selected()?.id);

  /** The open character's variant rules in force, and for its owner the ones they could enable. */
  public readonly rules = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: variantRulesKey(id),
      queryFn: async (): Promise<CharacterVariantRules> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.variantRules, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** Enables a variant rule on the open character. */
  public async enable(variantId: VariantRuleId): Promise<void> {
    const id = this.#openId();
    const rules = await this.#api.call(CharacterContract.enableVariantRule, { params: { id }, body: { variantId } });
    await this.#client.cancelQueries({ queryKey: variantRulesKey(id) });
    this.#client.setQueryData(variantRulesKey(id), rules);
  }

  /** Stops the open character using a variant rule. */
  public async disable(variantId: VariantRuleId): Promise<void> {
    const id = this.#openId();
    const rules = await this.#api.call(CharacterContract.disableVariantRule, {
      params: { id, variantId },
      body: undefined,
    });
    await this.#client.cancelQueries({ queryKey: variantRulesKey(id) });
    this.#client.setQueryData(variantRulesKey(id), rules);
  }

  #openId(): CharacterId {
    const id = this.#id();
    if (id === undefined) {
      throw new Error('No character selected');
    }
    return id;
  }
}
