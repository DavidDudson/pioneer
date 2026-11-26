import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type {
  CharacterId,
  CharacterRuleLimitSettings,
  RuleLimitField,
  RuleLimitSettingValue,
} from '@pioneer/character/domain';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';
import { QueryClient } from '@tanstack/angular-query-experimental';

import { characterKeys } from './character-query-keys';
import { CharacterStore } from './character-store';

/**
 * The table limits of the open character: each with the number in force, and whether its owner or its campaign decides.
 * Cached by TanStack Query apart from the build, as changing a limit never changes the character's version. A change
 * also drops the limits the sheet's inventory is held to (`CharacterRuleLimitStore`), so its flags follow at once
 * (ADR-0064). Provided by the sheet page.
 */
@Injectable()
export class CharacterRuleLimitSettingStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #characters = inject(CharacterStore);
  readonly #settings = injectScopedQuery<CharacterId, CharacterRuleLimitSettings>({
    id: computed(() => this.#characters.selected()?.id),
    key: characterKeys.ruleLimitSettings,
    fetch: async (id) => this.#api.call(CharacterContract.ruleLimitSettings, { params: { id }, body: undefined }),
    missing: 'No character selected',
  });

  /** The open character's limits, each with the number in force. */
  public readonly settings = this.#settings.query;

  /** Sets one limit of the open character. */
  public async set(limit: RuleLimitField, value: RuleLimitSettingValue): Promise<void> {
    const id = this.#settings.openId();

    const settings = await this.#api.call(CharacterContract.setRuleLimitSetting, {
      params: { id, limit },
      body: { value },
    });

    await this.#store(id, settings);
  }

  /** Returns one limit of the open character to the core rules' number. */
  public async reset(limit: RuleLimitField): Promise<void> {
    const id = this.#settings.openId();

    const settings = await this.#api.call(CharacterContract.resetRuleLimitSetting, {
      params: { id, limit },
      body: undefined,
    });

    await this.#store(id, settings);
  }

  async #store(id: CharacterId, settings: CharacterRuleLimitSettings): Promise<void> {
    await this.#settings.replace(id, settings);
    await this.#client.invalidateQueries({ queryKey: characterKeys.ruleLimits(id) });
  }
}
