import { computed, inject, Injectable } from '@angular/core';
import { CharacterCompanionContract } from '@pioneer/character/domain';
import type {
  Character,
  CharacterCompanions,
  CompanionArchiveReason,
  CompanionId,
  CompanionName,
} from '@pioneer/character/domain';
import { CompanionKind } from '@pioneer/rules/sdk';
import type { ContentId, SlotKey } from '@pioneer/rules/sdk';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { characterKeys } from './character-query-keys';
import { CharacterStore } from './character-store';

/** What the owner gives to add an animal companion: the server's version is read from the open character. */
export interface NewAnimalCompanion {
  readonly name: CompanionName;
  readonly species: ContentId;
  /** The slot that granted it: the species choice of the feat. */
  readonly grantedBy: SlotKey;
}

/**
 * The companions the open character owns (ADR-0079), cached by TanStack Query. Every write shares the character's
 * transaction and bumps its version, so each one reloads the open character after it: the next edit then sends the
 * version the server holds. Provided by the sheet page.
 */
@Injectable()
export class CharacterCompanionStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #characters = inject(CharacterStore);
  readonly #id = computed(() => this.#characters.selected()?.id);

  /** The open character's live and archived companions. */
  public readonly companions = injectQuery(() => {
    const id = this.#id();

    return {
      queryKey: characterKeys.companions(id),
      queryFn: async (): Promise<CharacterCompanions> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }

        return this.#api.call(CharacterCompanionContract.companions, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** Adds an animal companion to the open character. */
  public async addAnimalCompanion({ name, species, grantedBy }: NewAnimalCompanion): Promise<void> {
    const open = this.#open();

    const companions = await this.#api.call(CharacterCompanionContract.addCompanion, {
      params: { id: open.id },
      body: { kind: CompanionKind.AnimalCompanion, name, form: { species }, grantedBy, expectedVersion: open.version },
    });

    await this.#written(companions);
  }

  /** Archives a live companion of the open character, as replaced or released. */
  public async archive(companionId: CompanionId, reason: CompanionArchiveReason): Promise<void> {
    const open = this.#open();

    const companions = await this.#api.call(CharacterCompanionContract.archiveCompanion, {
      params: { id: open.id, companionId },
      body: { reason, expectedVersion: open.version },
    });

    await this.#written(companions);
  }

  #open(): Character {
    const open = this.#characters.selected();

    if (open === undefined) {
      throw new Error('No character selected');
    }

    return open;
  }

  async #written(companions: CharacterCompanions): Promise<void> {
    await this.#client.cancelQueries({ queryKey: characterKeys.companions(this.#id()) });
    this.#client.setQueryData(characterKeys.companions(this.#id()), companions);
    await this.#characters.reload();
  }
}
