import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { INVENTORY_KINDS, PlayCommandField } from '@pioneer/character/domain';
import type { PlayCommand, SlotCountKey, UseCountKey } from '@pioneer/character/domain';
import { AsyncButton, AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { ContentKind } from '@pioneer/rules/sdk';
import { UseButtons } from '@pioneer/rules/ui';
import type { UsableLine } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { affordability } from '../sheet-actions';
import { countedViews } from '../sheet-counted';
import type { CountedViews } from '../sheet-counted';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { describeSaveError } from '../sheet-field';
import { SheetSpender } from '../sheet-spender';

/** What the counts are read from: the feats and actions with a frequency, and the items whose activations have one. */
const COUNTED_CONTENT_KINDS: readonly ContentKind[] = [...new Set([...FEAT_CONTENT_KINDS, ...INVENTORY_KINDS])];

/**
 * Spell slots per rank and the uses of feats and actions with a frequency (#346), each with the count held and a button
 * to spend one and one to refund one. What each holds at most comes from the build and the content, and the server
 * derives the same maxima, so a spend the build cannot pay is left as it was.
 */
@Component({
  selector: 'pio-sheet-counted',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text, TranslocoPipe, UseButtons],
  templateUrl: './sheet-counted.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCounted {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #characters = inject(CharacterStore);
  readonly #spender = inject(SheetSpender);

  /** The registry with the feats and actions, whose frequencies give the uses. */
  protected readonly registry = injectContentRegistry(COUNTED_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;

  protected readonly views = computed((): CountedViews | undefined => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const read = this.#play.play.data();
    return registry === undefined || character === undefined || read === undefined
      ? undefined
      : countedViews(registry, character, read.play.resources);
  });

  /** The Activate button of each activation's use, by the key its use is counted under: its cost, and what the turn can pay. */
  protected readonly activations = computed((): ReadonlyMap<UseCountKey, UsableLine> => {
    const turn = this.#spender.turn();
    return new Map(
      (this.views()?.uses ?? []).flatMap(({ key, name, activation }): [UseCountKey, UsableLine][] =>
        activation === undefined
          ? []
          : [
              [
                key,
                {
                  id: activation.item,
                  name,
                  cost: activation.cost,
                  upTo: activation.upTo,
                  payment: { use: key },
                  ...affordability(turn, activation.cost, activation.upTo),
                },
              ],
            ],
      ),
    );
  });

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  protected readonly spendSlot = (slot: SlotCountKey): (() => Promise<void>) =>
    this.#action({ field: PlayCommandField.SpendSlot, slot });
  protected readonly refundSlot = (slot: SlotCountKey): (() => Promise<void>) =>
    this.#action({ field: PlayCommandField.RefundSlot, slot });
  protected readonly spendUse = (use: UseCountKey): (() => Promise<void>) =>
    this.#action({ field: PlayCommandField.SpendUse, use });
  protected readonly refundUse = (use: UseCountKey): (() => Promise<void>) =>
    this.#action({ field: PlayCommandField.RefundUse, use });

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  #action(command: PlayCommand): () => Promise<void> {
    return async (): Promise<void> => this.#send(command);
  }

  async #send(command: PlayCommand): Promise<void> {
    this.busy.set(true);
    try {
      await this.#play.send(command);
    } finally {
      this.busy.set(false);
    }
  }
}
