import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Grid, Skeleton, Stack } from '@pioneer/frontier';
import { FocusSpellsView, SpellAccessListView } from '@pioneer/rules/ui';
import type { FocusLine } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { sheetFocus } from '../sheet-focus-spells';
import { sheetSpellAccess, SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import type { SheetSpellAccess } from '../sheet-prepared-spells';
import { SheetPreparedSpells } from '../sheet-prepared-spells/sheet-prepared-spells.component';
import { preparedFieldsOf } from '../sheet-spell-picks';
import { SpellAccess } from '../spell-access/spell-access.component';

const LOADING_SLOTS = 3;

/**
 * The open character's spell picks under its spellcasting entries (#478): a pick per prepared slot, its focus spells
 * (ADR-0048), and the uncommon and rare spells it has access to. The spells load only once the character has an entry, so a sheet without one never
 * fetches them.
 */
@Component({
  selector: 'pio-sheet-spells',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    FocusSpellsView,
    Grid,
    SheetPreparedSpells,
    Skeleton,
    SpellAccess,
    SpellAccessListView,
    Stack,
  ],
  templateUrl: './sheet-spells.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSpells {
  /** Whether the character has a spellcasting entry. */
  public readonly casts = input(false);
  /** Whether one of its entries is a focus entry, so its focus spells show a placeholder while they load. */
  public readonly focuses = input(false);

  /** Placeholder pickers while the spells load: a 1st-level caster's first row. */
  protected readonly loadingSlots = Array.from({ length: LOADING_SLOTS }, (_unused, index) => index);

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  /** The registry with the spells; loads once the character casts. */
  protected readonly spells = injectContentRegistry(SPELL_CONTENT_KINDS, () => this.casts());
  /** One pick per prepared slot at the character's level, by entry and rank. */
  protected readonly prepared = preparedFieldsOf({
    registry: this.spells.data,
    character: this.#store.selected,
    slots: this.#store.slots,
    select: async (slot, selection) => this.#store.selectSlot(slot, selection),
    clear: async (slot) => this.#store.clearSlot(slot),
    translate: (key) => this.#i18n.translate(key),
  });
  /** The character's focus spells and focus pool; undefined without a focus entry or while the spells load. */
  protected readonly focus = computed((): FocusLine | undefined => {
    const registry = this.spells.data();
    const character = this.#store.selected();
    return registry === undefined || character === undefined ? undefined : sheetFocus(registry, character);
  });
  /** The uncommon and rare spells the build has access to, and those it may add; undefined while the spells load. */
  protected readonly access = computed((): SheetSpellAccess | undefined => {
    const registry = this.spells.data();
    const character = this.#store.selected();
    return registry === undefined || character === undefined ? undefined : sheetSpellAccess(registry, character);
  });
}
