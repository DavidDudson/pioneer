import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type {
  CharacterId,
  CharacterPlay,
  PlayCommand,
  PlayEdit,
  TurnCommand,
  TurnEvent,
} from '@pioneer/character/domain';
import { ApiClient, ApiError } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { CharacterStore } from './character-store';

/** TanStack Query key for a character's play state. */
function playKey(id: CharacterId | undefined): readonly unknown[] {
  return ['characters', 'play', id];
}

/**
 * The open character's play state with its revision (#343), cached by TanStack Query apart from the build: a play
 * edit never changes the character's version, and a build save never touches it. Provided by the sheet page.
 */
@Injectable()
export class PlayStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #characters = inject(CharacterStore);
  readonly #id = computed(() => this.#characters.selected()?.id);

  public readonly play = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: playKey(id),
      queryFn: async (): Promise<CharacterPlay> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.play, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /**
   * One play edit at the revision last read. On success the cached play state becomes the server's answer; on a
   * conflict it is read again, so the next edit starts from what someone else saved.
   */
  public async send(command: PlayCommand): Promise<void> {
    await this.#patch(command);
  }

  /** A turn-cycle edit, as `send` makes it, answering with what the turn boundary did, in order. */
  public async sendTurn(command: TurnCommand): Promise<readonly TurnEvent[]> {
    return this.#patch(command);
  }

  async #patch(command: PlayEdit): Promise<readonly TurnEvent[]> {
    const id = this.#id();
    // The cache, not the signal: the signal catches up a tick after an edit.
    // A second edit straight after the first must carry the revision the first one saved.
    const current = this.#client.getQueryData<CharacterPlay>(playKey(id)) ?? this.play.data();
    if (id === undefined || current === undefined) {
      throw new Error('No play state loaded');
    }
    try {
      const body = { expectedRevision: current.revision, command };
      const { events, ...stored } = await this.#api.call(CharacterContract.patchPlay, { params: { id }, body });
      this.#client.setQueryData(playKey(id), stored);
      return events;
    } catch (error: unknown) {
      if (ApiError.isConflict(error)) {
        await this.#client.invalidateQueries({ queryKey: playKey(id) });
      }
      throw error;
    }
  }
}
