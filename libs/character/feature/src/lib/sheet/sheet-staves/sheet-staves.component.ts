import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  CarryState,
  INVENTORY_KINDS,
  InventoryItemId,
  ResourcesSpentSchema,
  SlotCountKey,
} from '@pioneer/character/domain';
import type { ResourcesSpent, StaffCommand } from '@pioneer/character/domain';
import { Stack } from '@pioneer/frontier';
import { ContentId } from '@pioneer/rules/sdk';
import type { ContentKind } from '@pioneer/rules/sdk';
import { StaffSpellsView } from '@pioneer/rules/ui';
import type { StaffCastRequest, StaffLine } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import { castStaffCommand, sheetStaves, uncastStaffCommand } from '../sheet-staves';

const STAVES_CONTENT_KINDS: readonly ContentKind[] = [...new Set([...SPELL_CONTENT_KINDS, ...INVENTORY_KINDS])];

/** Nothing spent, for a character with no play state loaded yet: every slot and charge is held. */
const NO_SPENT: ResourcesSpent = ResourcesSpentSchema.parse({});

/**
 * The staves the open character wears or holds, each in its own section of the spell list with its spells by rank, what
 * casting each costs and the charges it has left (#362). A spell is cast with a button for each way to pay for it,
 * labelled with the charges and the slot it spends (#372); the server checks the cast and refuses one the staff can't
 * pay for. The last cast can be taken back, which refunds its charges and its slot. The spell's effects are the table's.
 * Nothing loads for a character carrying nothing, and nothing shows without a staff.
 */
@Component({
  selector: 'pio-sheet-staves',
  imports: [Stack, StaffSpellsView],
  templateUrl: './sheet-staves.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetStaves {
  readonly #i18n = inject(TranslocoService);
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);

  /** Whether the character has an item in hand or on the body: a stowed or dropped staff is no spell source. */
  readonly #carrying = computed((): boolean =>
    (this.#characters.selected()?.document.inventory.items ?? []).some(
      ({ carry }) => carry.state === CarryState.Worn || carry.state === CarryState.Held,
    ),
  );

  /** The last cast made from the sheet, which can be taken back. */
  readonly #last = signal<StaffCommand | undefined>(undefined);

  /** The registry with the items and spells; loads once the character carries something. */
  protected readonly registry = injectContentRegistry(STAVES_CONTENT_KINDS, () => this.#carrying());

  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  protected readonly staves = computed((): readonly StaffLine[] => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const play = this.#play.play.data();
    if (registry === undefined || character === undefined) {
      return [];
    }
    return sheetStaves(registry, character, { resources: play?.play.resources ?? NO_SPENT, last: this.#last() });
  });

  protected readonly cast = async ({ staff, spell, slot }: StaffCastRequest): Promise<void> => {
    const command = castStaffCommand(
      InventoryItemId.parse(staff),
      ContentId.parse(spell),
      slot === undefined ? undefined : SlotCountKey.parse(slot),
    );
    const sent = await this.#send(command);
    if (sent) {
      this.#last.set(command);
    }
  };

  protected readonly undo = async (staff: string): Promise<void> => {
    const last = this.#last();
    if (last === undefined || last.item !== InventoryItemId.parse(staff)) {
      return;
    }
    const sent = await this.#send(uncastStaffCommand(last));
    if (sent) {
      this.#last.set(undefined);
    }
  };

  /** One edit at a time: they share a revision, so a second would meet a conflict nothing caused. */
  async #send(command: StaffCommand): Promise<boolean> {
    this.busy.set(true);
    this.error.set(undefined);
    try {
      await this.#play.send(command);
      return true;
    } catch (error: unknown) {
      const { key, params } = describeSaveError(error);
      this.error.set(this.#i18n.translate(key, params));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
