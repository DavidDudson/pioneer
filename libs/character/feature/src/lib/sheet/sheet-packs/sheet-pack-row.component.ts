import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { EnabledPack } from '@pioneer/character/domain';
import { AsyncButton, Badge, ListItem, Stack, Text } from '@pioneer/frontier';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';

import { CharacterPackStore } from '../../data/character-pack-store';

/**
 * One pack the open character uses: its title and publisher, whether it is always on, what needs it, and for the owner
 * a Disable button where the pack may be turned off. Disabling acts on the first press, as the owner can enable it
 * again.
 */
@Component({
  selector: 'pio-sheet-pack-row',
  imports: [AsyncButton, Badge, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-pack-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPackRow {
  public readonly pack = input.required<EnabledPack>();
  /** Disabled since the list loaded: the row stays, marked, so the focused button and its tick survive. */
  public readonly disabled = input(false);
  /** The pack was disabled from here. */
  public readonly turnedOff = output<ContentPackId>();

  readonly #store = inject(CharacterPackStore);
  readonly #i18n = inject(TranslocoService);

  /** A pack another enabled pack still extends says so; anything else is a retry. */
  protected readonly describeDisableError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('character.packs.disableFailed');
  };

  protected readonly disable = async (): Promise<void> => {
    const { packId } = this.pack();
    await this.#store.disable(packId);
    this.turnedOff.emit(packId);
  };
}
