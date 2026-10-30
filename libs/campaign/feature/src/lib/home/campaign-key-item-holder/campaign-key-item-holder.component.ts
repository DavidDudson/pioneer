import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterId } from '@pioneer/campaign/domain';
import type { KeyItemView } from '@pioneer/campaign/domain';
import { AsyncButton, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { OptionPicker } from '@pioneer/rules/ui';

import { CampaignKeyItemStore } from '../../data/campaign-key-item-store';
import { CampaignStore } from '../../data/campaign-store';

/**
 * The GM's controls for one key item: give it to a character in the party, or move it from the one holding it, take it
 * back to the party stash, or archive it. Archiving takes the holder's line with it and keeps the history (ADR-0062), so
 * it acts on the first press.
 */
@Component({
  selector: 'pio-campaign-key-item-holder',
  imports: [AsyncButton, OptionPicker, Stack, TranslocoPipe],
  templateUrl: './campaign-key-item-holder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignKeyItemHolder {
  public readonly keyItem = input.required<KeyItemView>();

  readonly #keyItems = inject(CampaignKeyItemStore);
  readonly #campaigns = inject(CampaignStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly chosen = signal<string | undefined>(undefined);
  /** The party's characters, less the one holding the key item already. */
  protected readonly options = computed((): readonly SelectOption<string>[] => {
    const { holder } = this.keyItem();
    return (this.#campaigns.party.data()?.characters ?? [])
      .filter((character) => character.characterId !== holder)
      .map((character) => ({ value: character.characterId, label: character.name }));
  });
  protected readonly idle = computed((): boolean => this.chosen() === undefined);

  protected readonly give = async (): Promise<void> => {
    const chosen = this.chosen();
    if (chosen !== undefined) {
      await this.#keyItems.give(this.keyItem().id, CharacterId.parse(chosen));
      this.chosen.set(undefined);
    }
  };

  protected readonly takeBack = async (): Promise<void> => this.#keyItems.takeBack(this.keyItem().id);

  protected readonly archive = async (): Promise<void> => this.#keyItems.archive(this.keyItem().id);

  protected readonly describeError = (): string => this.#i18n.translate('campaign.keyItems.changeFailed');
}
