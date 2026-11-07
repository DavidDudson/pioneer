import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { INVENTORY_KINDS, PlayCommandField, Resource } from '@pioneer/character/domain';
import type { PlayCommand, SlotCountKey } from '@pioneer/character/domain';
import { AsyncButton, AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text } from '@pioneer/frontier';
import { SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentKind } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { countedViews } from '../sheet-counted';
import type { CountedViews } from '../sheet-counted';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { describeSaveError } from '../sheet-field';
import { SheetResources } from '../sheet-resources/sheet-resources.component';
import { SheetState } from '../sheet-state';

/** What the slots are read from: the same content the counts of the sheet read. */
const SLOT_CONTENT_KINDS: readonly ContentKind[] = [...new Set([...FEAT_CONTENT_KINDS, ...INVENTORY_KINDS])];

/** What the panel holds: the slots of the spontaneous entries, and whether the character has focus points. */
interface SpellResources {
  readonly slots: CountedViews['slots'];
  readonly focus: boolean;
}

/**
 * The resources a spell is cast from, tracked on the Spells tab (#1782): the spell slots per rank of each spontaneous
 * entry, each with the count held and a button to spend one and one to refund one, and the focus points. Prepared
 * entries need no resource, so a caster with only those shows no slot rows, and a character with neither slots nor focus
 * points shows no panel.
 */
@Component({
  selector: 'pio-sheet-spell-resources',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, SheetResources, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-spell-resources.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSpellResources {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #characters = inject(CharacterStore);
  readonly #sheet = inject(SheetState);

  protected readonly registry = injectContentRegistry(SLOT_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;

  /** The panel's contents; undefined while they load, and when there is nothing to show. */
  protected readonly shown = computed((): SpellResources | undefined => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const read = this.#play.play.data();
    if (registry === undefined || character === undefined || read === undefined) {
      return undefined;
    }
    const slots = countedViews(registry, character, read.play.resources).slots.filter(
      ({ preparation }) => preparation === SpellPreparation.Spontaneous,
    );
    const focus = (this.#sheet.resourceMaxima()?.[Resource.FocusPoints] ?? 0) > 0;
    return slots.length === 0 && !focus ? undefined : { slots, focus };
  });

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  protected readonly spend = (slot: SlotCountKey): (() => Promise<void>) =>
    this.#action({ field: PlayCommandField.SpendSlot, slot });
  protected readonly refund = (slot: SlotCountKey): (() => Promise<void>) =>
    this.#action({ field: PlayCommandField.RefundSlot, slot });

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
