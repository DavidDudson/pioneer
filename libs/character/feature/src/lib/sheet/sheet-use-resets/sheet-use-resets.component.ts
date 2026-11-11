import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { INVENTORY_KINDS, PlayCommandField } from '@pioneer/character/domain';
import type { UseCountKey } from '@pioneer/character/domain';
import { AsyncButton, AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { ContentKind } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { resettableUses } from '../sheet-counted';
import type { UseView } from '../sheet-counted';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { describeSaveError } from '../sheet-field';

/** What the uses are read from: the same content the counts of the sheet read. */
const USE_CONTENT_KINDS: readonly ContentKind[] = [...new Set([...FEAT_CONTENT_KINDS, ...INVENTORY_KINDS])];

/**
 * The uses of feats, actions and items with a frequency that only the player or a rest gives back (a frequency of a
 * minute or longer): what is spent, the rounds a countdown has left, and a Reset button. Turn, round and daily
 * frequencies come back on their own boundary and are not listed. Nothing is shown while none is spent.
 */
@Component({
  selector: 'pio-sheet-use-resets',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-use-resets.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetUseResets {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #characters = inject(CharacterStore);

  protected readonly registry = injectContentRegistry(USE_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;

  protected readonly views = computed((): readonly UseView[] => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const read = this.#play.play.data();
    return registry === undefined || character === undefined || read === undefined
      ? []
      : resettableUses(registry, character, read.play.resources);
  });

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  protected readonly reset =
    (use: UseCountKey): (() => Promise<void>) =>
    async (): Promise<void> => {
      this.busy.set(true);
      try {
        await this.#play.send({ field: PlayCommandField.ResetUse, use });
      } finally {
        this.busy.set(false);
      }
    };

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
