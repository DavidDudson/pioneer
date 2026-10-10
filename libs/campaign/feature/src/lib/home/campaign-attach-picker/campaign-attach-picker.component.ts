import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideUserPlus } from '@lucide/angular';
import { CharacterId } from '@pioneer/campaign/domain';
import type { CampaignId, OwnedCharacter } from '@pioneer/campaign/domain';
import { AsyncButton, AsyncForm, EmptyState, Heading, Link, SelectField, Stack } from '@pioneer/frontier';
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
  imports: [AsyncButton, AsyncForm, EmptyState, FormField, Heading, Link, SelectField, Stack, TranslocoPipe],
  templateUrl: './campaign-attach-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignAttachPicker {
  public readonly attachable = input.required<readonly OwnedCharacter[]>();
  /** A character joined the party from here. */
  public readonly attached = output<CharacterId>();

  readonly #store = inject(CampaignStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly emptyIcon = LucideUserPlus;
  /**
   * Set once a character joins from here. The form then stays, even with nothing left to pick, so the
   * focused submit button and its tick survive bringing in the last free character.
   */
  readonly #attachedHere = signal(false);
  protected readonly showForm = computed(() => this.attachable().length > 0 || this.#attachedHere());

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
    this.#attachedHere.set(true);
    this.attached.emit(characterId);
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
