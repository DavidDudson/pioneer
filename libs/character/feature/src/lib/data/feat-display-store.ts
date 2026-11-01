import { computed, inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterId, FeatDisplayChoice, FeatDisplaySection } from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectMutation, injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { characterKeys } from './character-query-keys';
import { CharacterStore } from './character-store';

/** A choice to show or hide the grant-only feats of one section of a character's sheet. */
interface FeatDisplaySwitch {
  readonly id: CharacterId;
  readonly section: FeatDisplaySection;
  readonly showGrantOnly: boolean;
}

/**
 * Where the user shows the open character's grant-only feats (ADR-0052), cached by TanStack Query apart from the
 * build: a choice never changes the character's version. Provided by the sheet page.
 */
@Injectable()
export class FeatDisplayStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #characters = inject(CharacterStore);
  readonly #id = computed(() => this.#characters.selected()?.id);

  readonly #choice = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: characterKeys.featDisplay(id),
      queryFn: async (): Promise<FeatDisplayChoice> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.featDisplay, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
      // A preference that can't be read falls back to the default at once, rather than holding the sheet up.
      retry: false,
    };
  });

  /** The sections where the user shows the grant-only feats; none until they choose, or if it can't be read. */
  public readonly shownIn: Signal<readonly FeatDisplaySection[]> = computed(
    () => this.#choice.data()?.showGrantOnly ?? [],
  );

  readonly #save = injectMutation(() => ({
    mutationFn: async ({ id, section, showGrantOnly }: FeatDisplaySwitch): Promise<FeatDisplayChoice> =>
      this.#api.call(CharacterContract.setFeatDisplay, { params: { id }, body: { section, showGrantOnly } }),
    onMutate: ({ id, section, showGrantOnly }: FeatDisplaySwitch): void => {
      const shown = new Set(this.#client.getQueryData<FeatDisplayChoice>(characterKeys.featDisplay(id))?.showGrantOnly);
      if (showGrantOnly) {
        shown.add(section);
      } else {
        shown.delete(section);
      }
      this.#client.setQueryData<FeatDisplayChoice>(characterKeys.featDisplay(id), { showGrantOnly: [...shown] });
    },
    // The filter is a display preference: a failed save is dropped, and the next choice tries again.
    onError: async (_error: unknown, { id }: FeatDisplaySwitch): Promise<void> =>
      this.#client.invalidateQueries({ queryKey: characterKeys.featDisplay(id), refetchType: 'none' }),
  }));

  /** Shows or hides the open character's grant-only feats in `section`; the page doesn't wait for it. */
  public show(section: FeatDisplaySection, showGrantOnly: boolean): void {
    const id = this.#id();
    if (id !== undefined) {
      this.#save.mutate({ id, section, showGrantOnly });
    }
  }
}
