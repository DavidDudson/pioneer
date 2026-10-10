import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterId } from '@pioneer/campaign/domain';
import type { CampaignId, OwnedCharacter } from '@pioneer/campaign/domain';
import { AsyncButton, AsyncForm, Heading, Link, SelectField, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ApiError } from '@pioneer/shared/web';
import * as z from 'zod';

import { CampaignStore } from '../../data/campaign-store';

/** What the picker submits; the same schema the server validates with. */
const AttachForm = z.object({ characterId: CharacterId });

interface AttachModel {
  readonly characterId: string;
}

/** The user's characters that are in no campaign, to bring one into the open campaign's party. */
@Component({
  selector: 'pio-campaign-attach-picker',
  imports: [AsyncButton, AsyncForm, FormField, Heading, Link, SelectField, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-attach-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignAttachPicker {
  public readonly attachable = input.required<readonly OwnedCharacter[]>();

  readonly #store = inject(CampaignStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly options = computed((): readonly SelectOption<string>[] =>
    this.attachable().map((character) => ({ value: character.characterId, label: character.name })),
  );

  protected readonly model = signal<AttachModel>({ characterId: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, AttachForm);
  });

  protected readonly attach = async (value: AttachModel): Promise<void> => {
    const { characterId } = AttachForm.parse(value);
    await this.#store.attachCharacter(this.#campaignId(), characterId);
    // The character is in the party now and out of the picker: ready for the next.
    this.form().reset({ characterId: '' });
  };

  /** A character another campaign took since the picker loaded says so; anything else is a retry. */
  protected readonly describeAttachError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('campaign.party.attachFailed');
  };

  #campaignId(): CampaignId {
    const campaign = this.#store.selected.data();
    if (campaign === undefined) {
      throw new Error('No campaign loaded');
    }
    return campaign.id;
  }
}
