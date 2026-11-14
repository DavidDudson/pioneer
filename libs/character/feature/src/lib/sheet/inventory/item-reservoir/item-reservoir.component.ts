import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CharacterPatchField,
  hasReservoirRune,
  InventoryItemId,
  reservoirRefusal,
  spellContent,
} from '@pioneer/character/domain';
import type { InventoryItem, RunedContent, SpellContent } from '@pioneer/character/domain';
import { AsyncButton, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ContentKind } from '@pioneer/rules/sdk';
import type { SpellRank } from '@pioneer/rules/sdk';
import { OptionPicker } from '@pioneer/rules/ui';

import { CharacterStore } from '../../../data/character-store';
import { injectContentRegistry } from '../../../data/content-registry-query';
import { describeSaveError } from '../../sheet-field';

/** The spell a reservoir holds, as shown: the name the content gives it and the rank it was cast at. */
interface Held {
  readonly name: string;
  readonly rank: SpellRank;
}

/**
 * One item with a spell reservoir rune: the spell it holds by name and rank, a picker to cast another into it while it
 * is empty, and the two ways to expend the held spell. Shown only while the item has the rune. The Strike of a Channeled
 * Release is the player's own, and the spell's effects are not applied.
 */
@Component({
  selector: 'pio-item-reservoir',
  imports: [AsyncButton, OptionPicker, Stack, Text, TranslocoPipe],
  templateUrl: './item-reservoir.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemReservoir {
  /** The inventory item's id, as the line carries it. */
  public readonly id = input.required({ transform: (id: string): InventoryItemId => InventoryItemId.parse(id) });
  /** The name the line shows, for the labels. */
  public readonly name = input.required<string>();
  /** The items and runes the loaded packs offer. */
  public readonly content = input.required<RunedContent>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  readonly #item: Signal<InventoryItem | undefined> = computed(() =>
    this.#store.selected()?.document.inventory.items.find((each) => each.id === this.id()),
  );

  /** Whether the item has a spell reservoir rune, which is all that lets it hold a spell. */
  protected readonly reserved = computed(() => {
    const item = this.#item();
    return item !== undefined && hasReservoirRune(item, this.content().items.get(item.item), this.content().runes);
  });

  /** The spells, loaded only while an item has the rune. */
  readonly #registry = injectContentRegistry([ContentKind.Spell], () => this.reserved());

  readonly #spells: Signal<SpellContent | undefined> = computed(() => {
    const registry = this.#registry.data();
    return registry === undefined ? undefined : spellContent(registry);
  });

  /** The spell the weapon holds, by name; its id when the content is not loaded. */
  protected readonly held = computed((): Held | undefined => {
    const spell = this.#item()?.state?.spell;
    return spell === undefined
      ? undefined
      : { name: this.#spells()?.anySpell(spell.spell)?.name ?? spell.spell, rank: spell.rank };
  });

  /** The spells that can be cast into the weapon. */
  protected readonly options = computed((): readonly SelectOption<string>[] => {
    const item = this.#item();
    const spells = this.#spells();
    if (item === undefined || spells === undefined) {
      return [];
    }
    const reads = { ...this.content(), spells };
    return spells.spells
      .filter((spell) => reservoirRefusal(item, spell.id, reads) === undefined)
      .map((spell) => ({ value: spell.id, label: `${spell.name} (${spell.rank})` }));
  });

  protected readonly chosen = signal<string | undefined>(undefined);

  /** Casts the chosen spell into the weapon, at its own rank. */
  protected readonly store = async (): Promise<void> => {
    const item = this.#item();
    const option = this.#spells()?.spells.find((spell) => spell.id === this.chosen());
    if (item === undefined || option === undefined) {
      return;
    }
    await this.#store.patch({
      field: CharacterPatchField.SetItemState,
      id: item.id,
      state: { ...item.state, spell: { spell: option.id, rank: option.rank } },
    });
    this.chosen.set(undefined);
  };

  /** Empties the held spell: Channeled Release and Safe Release both leave the weapon with none. */
  protected readonly expend = async (): Promise<void> => {
    const item = this.#item();
    if (item === undefined) {
      return;
    }
    const { spell: _spent, ...rest } = item.state ?? {};
    await this.#store.patch({ field: CharacterPatchField.SetItemState, id: item.id, state: rest });
  };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
