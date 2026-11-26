import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterId, CharacterVariantRules } from '@pioneer/character/domain';
import type { VariantRuleId } from '@pioneer/rules/sdk';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';

import { characterKeys } from './character-query-keys';
import { CharacterStore } from './character-store';

/**
 * The variant rules the open character uses, cached by TanStack Query apart from the build: enabling one never changes
 * the character's version. Who decides them (the owner, or the campaign the character is in) comes with the list. The
 * sheet's registry is built over the enabled ones (`injectContentRegistry`). Provided by the sheet page.
 */
@Injectable()
export class CharacterVariantStore {
  readonly #api = inject(ApiClient);
  readonly #characters = inject(CharacterStore);
  readonly #variants = injectScopedQuery<CharacterId, CharacterVariantRules>({
    id: computed(() => this.#characters.selected()?.id),
    key: characterKeys.variantRules,
    fetch: async (id) => this.#api.call(CharacterContract.variantRules, { params: { id }, body: undefined }),
    missingMessage: 'No character selected',
  });

  /** The open character's variant rules in force, and for its owner the ones they could enable. */
  public readonly rules = this.#variants.query;

  /** Enables a variant rule on the open character. */
  public async enable(variantId: VariantRuleId): Promise<void> {
    const id = this.#variants.openId();
    const rules = await this.#api.call(CharacterContract.enableVariantRule, { params: { id }, body: { variantId } });
    await this.#variants.replace(id, rules);
  }

  /** Stops the open character using a variant rule. */
  public async disable(variantId: VariantRuleId): Promise<void> {
    const id = this.#variants.openId();

    const rules = await this.#api.call(CharacterContract.disableVariantRule, {
      params: { id, variantId },
      body: undefined,
    });

    await this.#variants.replace(id, rules);
  }
}
