import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type {
  CharacterId,
  CharacterRuleLimitSettings,
  RuleLimitField,
  RuleLimitSettingValue,
} from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { CharacterStore } from './character-store';

/** TanStack Query key for the table limits a character sets, and who decides them. */
function settingsKey(id: CharacterId | undefined): readonly unknown[] {
  return ['characters', 'rule-limit-settings', id];
}

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
  readonly #id = computed(() => this.#characters.selected()?.id);

  /** The open character's limits, each with the number in force. */
  public readonly settings = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: settingsKey(id),
      queryFn: async (): Promise<CharacterRuleLimitSettings> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.ruleLimitSettings, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** Sets one limit of the open character. */
  public async set(limit: RuleLimitField, value: RuleLimitSettingValue): Promise<void> {
    const id = this.#openId();
    const settings = await this.#api.call(CharacterContract.setRuleLimitSetting, {
      params: { id, limit },
      body: { value },
    });
    await this.#store(id, settings);
  }

  /** Returns one limit of the open character to the core rules' number. */
  public async reset(limit: RuleLimitField): Promise<void> {
    const id = this.#openId();
    const settings = await this.#api.call(CharacterContract.resetRuleLimitSetting, {
      params: { id, limit },
      body: undefined,
    });
    await this.#store(id, settings);
  }

  async #store(id: CharacterId, settings: CharacterRuleLimitSettings): Promise<void> {
    await this.#client.cancelQueries({ queryKey: settingsKey(id) });
    this.#client.setQueryData(settingsKey(id), settings);
    await this.#client.invalidateQueries({ queryKey: ['characters', 'rule-limits', id] });
  }

  #openId(): CharacterId {
    const id = this.#id();
    if (id === undefined) {
      throw new Error('No character selected');
    }
    return id;
  }
}
