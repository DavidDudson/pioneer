import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { KeyItemView } from '@pioneer/campaign/domain';
import { Select } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

import { ALL_HOLDERS, holderChoices, STASH_HOLDER } from '../../data/key-item-filter';

/** Narrows the Party Inventory to the key items one character holds, or to those in the party stash. */
@Component({
  selector: 'pio-campaign-key-item-filter',
  imports: [Select, TranslocoPipe],
  templateUrl: './campaign-key-item-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignKeyItemFilter {
  public readonly keyItems = input.required<readonly KeyItemView[]>();
  /** The holder kept: everyone's, the stash, or a character's id. */
  public readonly value = model<string | undefined>(ALL_HOLDERS);

  readonly #i18n = inject(TranslocoService);

  protected readonly options = computed((): readonly SelectOption<string>[] => [
    { value: ALL_HOLDERS, label: this.#i18n.translate('campaign.keyItems.filter.all') },
    { value: STASH_HOLDER, label: this.#i18n.translate('campaign.keyItems.filter.stash') },
    ...holderChoices(this.keyItems()).map(({ id, name }) => ({ value: id, label: name })),
  ]);
}
