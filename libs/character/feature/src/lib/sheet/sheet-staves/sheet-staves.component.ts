import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CarryState, INVENTORY_KINDS } from '@pioneer/character/domain';
import type { StaffCharges } from '@pioneer/character/domain';
import { Stack } from '@pioneer/frontier';
import type { ContentKind } from '@pioneer/rules/sdk';
import { StaffSpellsView } from '@pioneer/rules/ui';
import type { StaffLine } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import { sheetStaves } from '../sheet-staves';

const STAVES_CONTENT_KINDS: readonly ContentKind[] = [...new Set([...SPELL_CONTENT_KINDS, ...INVENTORY_KINDS])];

const NO_CHARGES: StaffCharges = {};

/**
 * The staves the open character wears or holds, each in its own section of the spell list with its spells by rank, what
 * casting each costs and the charges it has left (#362). Casting and spending charges are other stories; this only shows
 * the spells. Nothing loads for a character carrying nothing, and nothing shows without a staff.
 */
@Component({
  selector: 'pio-sheet-staves',
  imports: [Stack, StaffSpellsView],
  templateUrl: './sheet-staves.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetStaves {
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);

  /** Whether the character has an item in hand or on the body: a stowed or dropped staff is no spell source. */
  readonly #carrying = computed((): boolean =>
    (this.#characters.selected()?.document.inventory.items ?? []).some(
      ({ carry }) => carry.state === CarryState.Worn || carry.state === CarryState.Held,
    ),
  );

  /** The registry with the items and spells; loads once the character carries something. */
  protected readonly registry = injectContentRegistry(STAVES_CONTENT_KINDS, () => this.#carrying());

  protected readonly staves = computed((): readonly StaffLine[] => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    if (registry === undefined || character === undefined) {
      return [];
    }
    return sheetStaves(registry, character, this.#play.play.data()?.play.resources.staff ?? NO_CHARGES);
  });
}
