import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucidePackagePlus } from '@lucide/angular';
import { EnabledPackId } from '@pioneer/campaign/domain';
import type { CampaignId, PackCandidate } from '@pioneer/campaign/domain';
import { AsyncButton, AsyncForm, EmptyState, Heading, Link, SelectField, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ApiError } from '@pioneer/shared/web';
import * as z from 'zod';

import { CampaignStore } from '../../data/campaign-store';

/** What the picker submits; the same schema the server validates with. */
const EnableForm = z.object({ packId: EnabledPackId });

interface EnableModel {
  readonly packId: string;
}

/** The packs the GM may read and has not enabled, to enable one, with the packs it extends, in the open campaign. */
@Component({
  selector: 'pio-campaign-pack-picker',
  imports: [AsyncButton, AsyncForm, EmptyState, FormField, Heading, Link, SelectField, Stack, TranslocoPipe],
  templateUrl: './campaign-pack-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPackPicker {
  public readonly candidates = input.required<readonly PackCandidate[]>();
  /** A pack was enabled from here. */
  public readonly enabled = output<EnabledPackId>();

  readonly #store = inject(CampaignStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly emptyIcon = LucidePackagePlus;
  /**
   * Set once a pack is enabled from here. The form then stays, even with nothing left to pick, so the focused submit
   * button and its tick survive enabling the last pack.
   */
  readonly #enabledHere = signal(false);
  protected readonly showForm = computed(() => this.candidates().length > 0 || this.#enabledHere());

  protected readonly options = computed((): readonly SelectOption<string>[] =>
    this.candidates().map((pack) => ({
      value: pack.packId,
      label: pack.private ? this.#i18n.translate('campaign.packs.privateOption', { title: pack.title }) : pack.title,
    })),
  );

  protected readonly model = signal<EnableModel>({ packId: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, EnableForm);
  });

  protected readonly enable = async (value: EnableModel): Promise<void> => {
    const { packId } = EnableForm.parse(value);
    await this.#store.enablePack(this.#campaignId(), packId);
    // The pack is in use now and out of the picker: ready for the next.
    this.form().reset({ packId: '' });
    this.#enabledHere.set(true);
    this.enabled.emit(packId);
  };

  /** A private pack, or one that cannot be used, says why; anything else is a retry. */
  protected readonly describeEnableError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('campaign.packs.enableFailed');
  };

  #campaignId(): CampaignId {
    const campaign = this.#store.selected.data();
    if (campaign === undefined) {
      throw new Error('No campaign loaded');
    }
    return campaign.id;
  }
}
