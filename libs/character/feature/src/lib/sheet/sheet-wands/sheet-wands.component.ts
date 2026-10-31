import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { CarryState, CharacterPatchField, INVENTORY_KINDS, InventoryItemId } from '@pioneer/character/domain';
import type { PlayCommand } from '@pioneer/character/domain';
import { Stack } from '@pioneer/frontier';
import { presentRoll, RANDOM_SOURCE, RollPresenter } from '@pioneer/play/ui';
import type { ContentKind } from '@pioneer/rules/sdk';
import { WandSpellsView } from '@pioneer/rules/ui';
import type { WandLine } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import { rollFlatCheck } from '../sheet-wand-roll';
import { castCommand, overchargeCommand, sheetWands } from '../sheet-wands';
import type { PendingChecks } from '../sheet-wands';

const WANDS_CONTENT_KINDS: readonly ContentKind[] = [...new Set([...SPELL_CONTENT_KINDS, ...INVENTORY_KINDS])];

/**
 * The wands the open character holds, each in its own section of the spell list with its cast for the day (#370). A
 * wand casts once a day; once that is spent the player can overcharge it, and the flat check is rolled here and shown
 * with what it comes to before the player confirms. The spell's effects are the table's; this spends the cast and
 * applies the wand's fate.
 */
@Component({
  selector: 'pio-sheet-wands',
  imports: [Stack, WandSpellsView],
  templateUrl: './sheet-wands.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetWands {
  readonly #i18n = inject(TranslocoService);
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);
  readonly #presenter = inject(RollPresenter);
  readonly #random = inject(RANDOM_SOURCE);
  #rolled = 0;

  /** Whether the character holds an item: a wand has to be in hand to be a spell source. */
  readonly #holding = computed((): boolean =>
    (this.#characters.selected()?.document.inventory.items ?? []).some(({ carry }) => carry.state === CarryState.Held),
  );

  /** The registry with the items and spells; loads once the character holds something. */
  protected readonly registry = injectContentRegistry(WANDS_CONTENT_KINDS, () => this.#holding());

  /** The overcharges rolled and waiting for the player to confirm them. */
  protected readonly pending = signal<PendingChecks>({});
  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  protected readonly wands = computed((): readonly WandLine[] => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const play = this.#play.play.data();
    return registry === undefined || character === undefined || play === undefined
      ? []
      : sheetWands(registry, character, { play: play.play, pending: this.pending() });
  });

  protected readonly cast = async (key: string): Promise<void> =>
    this.#send(async () => this.#play.send(castCommand(InventoryItemId.parse(key))));

  /** Rolls the flat check and shows what it comes to; nothing applies until the player confirms. */
  protected readonly overcharge = (key: string): void => {
    this.error.set(undefined);
    const { natural: roll, result } = rollFlatCheck(this.#random);
    this.#rolled += 1;
    const label = this.#i18n.translate('character.sheet.counted.overcharge');
    this.#presenter.present(presentRoll(this.#rolled, label, result));
    this.pending.update((checks) => ({ ...checks, [InventoryItemId.parse(key)]: { roll } }));
  };

  protected readonly confirm = async (key: string): Promise<void> => {
    const item = InventoryItemId.parse(key);
    const check = this.pending()[item];
    if (check === undefined) {
      return;
    }
    await this.#send(async () => this.#overcharge(overchargeCommand(item, check.roll)));
    this.decline(key);
  };

  protected readonly decline = (key: string): void => {
    const { [InventoryItemId.parse(key)]: _dropped, ...rest } = this.pending();
    this.pending.set(rest);
  };

  protected readonly repair = async (key: string): Promise<void> =>
    this.#send(async () =>
      this.#characters.patch({
        field: CharacterPatchField.SetItemBroken,
        id: InventoryItemId.parse(key),
        broken: false,
      }),
    );

  /** An overcharge can break or destroy the wand, which the server records in the inventory: read it again. */
  async #overcharge(command: PlayCommand): Promise<void> {
    await this.#play.send(command);
    await this.#characters.reload();
  }

  /** One edit at a time: they share a revision, so a second would meet a conflict nothing caused. */
  async #send(edit: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(undefined);
    try {
      await edit();
    } catch (error: unknown) {
      const { key, params } = describeSaveError(error);
      this.error.set(this.#i18n.translate(key, params));
    } finally {
      this.busy.set(false);
    }
  }
}
