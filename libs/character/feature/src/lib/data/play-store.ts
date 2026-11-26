import { computed, inject, Injectable, signal } from '@angular/core';
import { CharacterContract, TurnCommandField, TurnEventKind } from '@pioneer/character/domain';
import type {
  CharacterId,
  CharacterPlay,
  PlayCommand,
  PlayEdit,
  TurnCommand,
  TurnEvent,
} from '@pioneer/character/domain';
import type { ContentId } from '@pioneer/rules/sdk';
import { ApiClient, ApiError } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { characterKeys } from './character-query-keys';
import { CharacterStore } from './character-store';

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
      queryKey: characterKeys.play(id),
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
    const id = this.#id();
    const boundary = command.field === TurnCommandField.StartTurn || command.field === TurnCommandField.EndTurn;

    if (boundary) {
      this.#offered.set(undefined);
    }

    const events = await this.#patch(command);

    if (boundary && id !== undefined && id === this.#id()) {
      const abilities = events.flatMap((event) => (event.kind === TurnEventKind.TriggerOffered ? [event.ability] : []));
      this.#offered.set({ character: id, abilities });
    }

    return events.filter((event) => event.kind !== TurnEventKind.TriggerOffered);
  }

  readonly #offered = signal<{ readonly character: CharacterId; readonly abilities: readonly ContentId[] } | undefined>(
    undefined,
  );

  /** The abilities the last turn boundary of the open character offered, until passed. */
  public readonly offers = computed((): readonly ContentId[] => {
    const offered = this.#offered();

    return offered !== undefined && offered.character === this.#id() ? offered.abilities : [];
  });

  /** The player let the offered abilities pass for this event. */
  public passOffers(): void {
    this.#offered.set(undefined);
  }

  async #patch(command: PlayEdit): Promise<readonly TurnEvent[]> {
    const id = this.#id();
    // The cache, not the signal: the signal catches up a tick after an edit.
    // A second edit straight after the first must carry the revision the first one saved.
    const current = this.#client.getQueryData<CharacterPlay>(characterKeys.play(id)) ?? this.play.data();

    if (id === undefined || current === undefined) {
      throw new Error('No play state loaded');
    }

    try {
      const body = { expectedRevision: current.revision, command };
      const { events, ...stored } = await this.#api.call(CharacterContract.patchPlay, { params: { id }, body });
      this.#client.setQueryData(characterKeys.play(id), stored);

      return events;
    } catch (error: unknown) {
      if (error instanceof ApiError && error.isConflict) {
        await this.#client.invalidateQueries({ queryKey: characterKeys.play(id) });
      }

      throw error;
    }
  }
}
