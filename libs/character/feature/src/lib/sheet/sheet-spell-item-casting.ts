import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  CarryState,
  CharacterPatchField,
  ConsumableCommandField,
  INVENTORY_KINDS,
  InventoryItemId,
  PlayCommandField,
  ResourcesSpentSchema,
  SlotCountKey,
  spellContent,
  spellCost,
  SpendId,
  SpendKind,
} from '@pioneer/character/domain';
import type { PlayCommand, ResourcesSpent } from '@pioneer/character/domain';
import { presentRoll, RANDOM_SOURCE, RollPresenter } from '@pioneer/play/ui';
import { ActionCost, ContentId } from '@pioneer/rules/sdk';
import type { ContentKind } from '@pioneer/rules/sdk';
import type { SpellItemEvent, SpellRowLine, WandAction } from '@pioneer/rules/ui';
import { newId } from '@pioneer/shared/kernel';

import { CharacterStore } from '../data/character-store';
import { injectContentRegistry } from '../data/content-registry-query';
import { PlayStore } from '../data/play-store';
import { spendCostOf } from './sheet-actions';
import { describeSaveError } from './sheet-field';
import { SPELL_CONTENT_KINDS } from './sheet-prepared-spells';
import { scrollRows, scrollSources, staffRows, wandRows } from './sheet-spell-items';
import type { ItemWords } from './sheet-spell-items';
import { SheetSpender } from './sheet-spender';
import { sheetStaves, staffSpendRequest } from './sheet-staves';
import { rollFlatCheck } from './sheet-wand-roll';
import { castCommand, overchargeCommand, sheetWands } from './sheet-wands';
import type { PendingChecks } from './sheet-wands';

const ITEM_CONTENT_KINDS: readonly ContentKind[] = [...new Set([...SPELL_CONTENT_KINDS, ...INVENTORY_KINDS])];

/** Nothing spent, for a character with no play state loaded yet: every slot and charge is held. */
const NO_SPENT: ResourcesSpent = ResourcesSpentSchema.parse({});

/**
 * The wands, staves and scrolls a character carries as rows of its spell list, and what the player does with them
 * (#370, #362, #372). A wand casts once a day, and can then be overcharged: the flat check is rolled here and shown with
 * what it comes to before the player confirms. A staff's spell is cast with the charges and slot the player picks, and
 * a scroll is spent as it is cast. A cast is a spend (#355): it takes its actions from the turn and joins the spend log,
 * where taking it back refunds what it cost. Nothing loads for a character carrying nothing.
 */
@Injectable()
export class SpellItemCasting {
  readonly #i18n = inject(TranslocoService);
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);
  readonly #spender = inject(SheetSpender);
  readonly #presenter = inject(RollPresenter);
  readonly #random = inject(RANDOM_SOURCE);
  #rolled = 0;

  /** Whether the character has an item in hand or on the body: a stowed or dropped item is no spell source. */
  readonly #carrying = computed((): boolean =>
    (this.#characters.selected()?.document.inventory.items ?? []).some(
      ({ carry }) => carry.state === CarryState.Worn || carry.state === CarryState.Held,
    ),
  );

  /** The registry with the items and spells; loads once the character carries something. */
  protected readonly registry = injectContentRegistry(ITEM_CONTENT_KINDS, () => this.#carrying());

  /** The overcharges rolled and waiting for the player to confirm them. */
  readonly #pending = signal<PendingChecks>({});
  public readonly busy = signal(false);
  public readonly error = signal<string | undefined>(undefined);

  /** A row for each spell of a wand, staff or scroll the character carries; none while the content loads. */
  public readonly rows = computed((): readonly SpellRowLine[] => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const play = this.#play.play.data();
    if (registry === undefined || character === undefined) {
      return [];
    }
    const words: ItemWords = { translate: (key, params) => this.#i18n.translate(key, params) };
    return [
      ...wandRows(
        registry,
        play === undefined ? [] : sheetWands(registry, character, { play: play.play, pending: this.#pending() }),
        words,
      ),
      ...staffRows(registry, sheetStaves(registry, character, { resources: play?.play.resources ?? NO_SPENT }), words),
      ...scrollRows(registry, scrollSources(registry, character), { ...words, turn: this.#spender.turn() }),
    ];
  });

  public readonly act = async (event: SpellItemEvent): Promise<void> => {
    if (event.kind === 'wand') {
      await this.#wandActions[event.action](InventoryItemId.parse(event.key));
    } else if (event.kind === 'staff') {
      await this.#staff(event.request);
    } else {
      await this.#scroll(event.key);
    }
  };

  readonly #wandActions: Readonly<Record<WandAction, (item: InventoryItemId) => Promise<void>>> = {
    cast: async (item) => this.#send(async () => this.#play.send(castCommand(item))),
    overcharge: async (item) => {
      this.#startOvercharge(item);
    },
    confirm: async (item) => this.#confirm(item),
    decline: async (item) => {
      this.#drop(item);
    },
    repair: async (item) =>
      this.#send(async () =>
        this.#characters.patch({ field: CharacterPatchField.SetItemBroken, id: item, broken: false }),
      ),
  };

  async #confirm(item: InventoryItemId): Promise<void> {
    const check = this.#pending()[item];
    if (check === undefined) {
      return;
    }
    await this.#send(async () => this.#overcharge(overchargeCommand(item, check.roll)));
    this.#drop(item);
  }

  /** Rolls the flat check and shows what it comes to; nothing applies until the player confirms. */
  #startOvercharge(item: InventoryItemId): void {
    this.error.set(undefined);
    const { natural: roll, result } = rollFlatCheck(this.#random);
    this.#rolled += 1;
    this.#presenter.present(
      presentRoll(this.#rolled, this.#i18n.translate('character.sheet.counted.overcharge'), result),
    );
    this.#pending.update((checks) => ({ ...checks, [item]: { roll } }));
  }

  #drop(item: InventoryItemId): void {
    const { [item]: _dropped, ...rest } = this.#pending();
    this.#pending.set(rest);
  }

  /** An overcharge can break or destroy the wand, which the server records in the inventory: read it again. */
  async #overcharge(command: PlayCommand): Promise<void> {
    await this.#play.send(command);
    await this.#characters.reload();
  }

  async #staff({ staff, spell, slot }: { staff: string; spell: string; slot: string | undefined }): Promise<void> {
    const registry = this.registry.data();
    if (registry === undefined) {
      return;
    }
    const request = staffSpendRequest(
      registry,
      {
        item: InventoryItemId.parse(staff),
        spell: ContentId.parse(spell),
        ...(slot === undefined ? {} : { slot: SlotCountKey.parse(slot) }),
      },
      SpendId.parse(newId()),
    );
    await this.#send(async () => this.#play.send({ field: PlayCommandField.SpendAction, ...request }));
  }

  /** Casts the scroll: its spell's cost spent from the turn and the stack down by one. */
  async #scroll(key: string): Promise<void> {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    if (registry === undefined || character === undefined) {
      return;
    }
    const scroll = scrollSources(registry, character).find((source) => source.key === key);
    if (scroll === undefined) {
      return;
    }
    const option = spellContent(registry).anySpell(scroll.spell);
    const range = option === undefined ? undefined : spellCost(option);
    const cost = spendCostOf(range?.cost ?? ActionCost.Free, undefined) ?? { kind: SpendKind.Free };
    await this.#send(async () =>
      this.#play.send({
        field: ConsumableCommandField.UseConsumable,
        item: InventoryItemId.parse(key),
        spend: { id: SpendId.parse(newId()), action: scroll.entry, cost },
      }),
    );
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
