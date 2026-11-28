import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  canTakeCoins,
  CharacterPatchField,
  CoinGrantReason,
  CoinsSchema,
  LedgerReason,
} from '@pioneer/character/domain';
import type { CharacterPatch } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncForm,
  Grid,
  Heading,
  NumberField,
  SegmentedField,
  Stack,
  Text,
  TextField,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

import { CharacterStore } from '../../../data/character-store';
import { describeSaveError } from '../../sheet-field';
import { CoinLootDraft, CoinLootForm, EMPTY_COIN_LOOT } from './coin-loot-form';
import type { CoinLootModel } from './coin-loot-form';

/** Each reason's label. */
const REASON_MESSAGES: Readonly<Record<CoinGrantReason, string>> = {
  [LedgerReason.Gift]: 'character.sheet.inventory.loot.reason.gift',
  [LedgerReason.Loot]: 'character.sheet.inventory.loot.reason.loot',
};

/** Names why a take is off: the purse is worth less than the coins. */
const CANNOT_TAKE_ID = 'pio-coin-loot-cannot-take';

/**
 * Coins added without paying (loot, a GM reward, a gift), or taken, in any mix of platinum, gold, silver and copper,
 * with a reason and a note: a `giftCoins` or a `takeCoins`. Take is disabled, with the reason, when the purse is
 * worth less. Inline, never a dialog.
 */
@Component({
  selector: 'pio-coin-loot',
  imports: [
    AsyncButton,
    AsyncForm,
    FormField,
    Grid,
    Heading,
    NumberField,
    SegmentedField,
    Stack,
    Text,
    TextField,
    TranslocoPipe,
  ],
  templateUrl: './coin-loot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinLoot {
  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly cannotTakeId = CANNOT_TAKE_ID;
  protected readonly model = signal<CoinLootModel>(EMPTY_COIN_LOOT);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, CoinLootDraft);
  });
  protected readonly reasons: ReadonlyArray<SelectOption<CoinGrantReason>> = CoinGrantReason.options.map(
    (reason): SelectOption<CoinGrantReason> => ({
      value: reason,
      label: this.#i18n.translate(REASON_MESSAGES[reason]),
    }),
  );

  /** Whether the purse is worth enough to take what the form holds; true while it holds nothing to take. */
  protected readonly takeable: Signal<boolean> = computed(() => {
    const character = this.#store.selected();
    const parsed = CoinLootForm.safeParse(this.model());

    if (character === undefined || !parsed.success) {
      return true;
    }

    return canTakeCoins(character.document, CoinsSchema.parse(parsed.data));
  });

  private readonly lootForm = viewChild.required(AsyncForm);
  /** An add is in flight: Take waits, so the two never race on one version. */
  protected readonly adding: Signal<boolean> = computed(() => this.lootForm().submission.isPending());
  /** A take is in flight: Add waits, likewise. */
  protected readonly taking = signal(false);

  protected readonly add = async (value: CoinLootModel): Promise<void> => {
    await this.#send(CharacterPatchField.GiftCoins, value);
  };

  /** Beside the form's submit, so it runs only while the form is valid. */
  protected readonly take = async (): Promise<void> => {
    this.taking.set(true);

    try {
      await this.#send(CharacterPatchField.TakeCoins, this.model());
    } finally {
      this.taking.set(false);
    }
  };

  /** The server's reason (coins that no longer cover the take, a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: Error): string => {
    const { key, params } = describeSaveError(error);

    return this.#i18n.translate(key, params);
  };

  async #send(
    field: typeof CharacterPatchField.GiftCoins | typeof CharacterPatchField.TakeCoins,
    value: CoinLootModel,
  ): Promise<void> {
    const { pp, gp, sp, cp, reason, note } = CoinLootForm.parse(value);
    const coins = CoinsSchema.parse({ pp, gp, sp, cp });
    const patch: CharacterPatch = note === '' ? { field, coins, reason } : { field, coins, reason, note };

    await this.#store.patch(patch);
    this.model.set(EMPTY_COIN_LOOT);
  }
}
