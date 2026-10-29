import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideUserPlus } from '@lucide/angular';
import { CharacterId } from '@pioneer/campaign/domain';
import type { CampaignId, OwnedCharacter } from '@pioneer/campaign/domain';
import { AsyncButton, AsyncForm, EmptyState, Heading, Link, Stack } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { ContentLoader } from '@pioneer/rules/data-access';
import { AncestryId, ContentKind } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { filter, merge } from 'rxjs';
import * as z from 'zod';

import { CampaignStore } from '../../data/campaign-store';
import { attachColumns, attachLabel, attachRows, attachValue, shownAttachRows } from './campaign-attach-table';

/** What the picker submits; the same schema the server validates with. */
const AttachForm = z.object({ characterId: CharacterId });

interface AttachModel {
  readonly characterId: string;
}

/** The user's characters that are in no campaign, to bring one into the open campaign's party. */
@Component({
  selector: 'pio-campaign-attach-picker',
  imports: [AsyncButton, AsyncForm, EmptyState, FormField, Heading, Link, PickerField, Stack, TranslocoPipe],
  templateUrl: './campaign-attach-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignAttachPicker {
  public readonly attachable = input.required<readonly OwnedCharacter[]>();
  /** A character joined the party from here. */
  public readonly attached = output<CharacterId>();

  readonly #store = inject(CampaignStore);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the language changes or the messages load, so the headers are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly emptyIcon = LucideUserPlus;
  /**
   * Set once a character joins from here. The form then stays, even with nothing left to pick, so the
   * focused submit button and its tick survive bringing in the last free character.
   */
  readonly #attachedHere = signal(false);
  protected readonly showForm = computed(() => this.attachable().length > 0 || this.#attachedHere());

  /** Every ancestry and class from the official packs, loaded on first use and kept for the session. */
  readonly #content = inject(ContentLoader);
  readonly #registry = injectQuery(() => ({
    queryKey: ['campaign', 'attach-origins'],
    queryFn: async (): Promise<ContentRegistry> =>
      this.#content.registry([ContentKind.Ancestry, ContentKind.Class], []),
    staleTime: Number.POSITIVE_INFINITY,
  }));
  protected readonly loading = computed(() => this.#registry.data() === undefined);

  /** A picked ancestry or class by name; empty while the content loads or the slot is unpicked. */
  readonly #nameOf = computed(() => {
    const registry = this.#registry.data();
    const classes = new Map<string, string>(
      (registry?.packs ?? [])
        .flatMap((pack) => pack.otherEntries)
        .flatMap((entry): [string, string][] => (entry.kind === ContentKind.Class ? [[entry.id, entry.name]] : [])),
    );
    return (id: string | undefined): string => {
      if (id === undefined || registry === undefined) {
        return '';
      }
      const ancestry = AncestryId.safeParse(id);
      return (
        (ancestry.success ? registry.ancestry(ancestry.data)?.definition.name : undefined) ?? classes.get(id) ?? ''
      );
    };
  });

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);
  protected readonly shown = computed(() =>
    shownAttachRows(
      attachRows(this.attachable(), (id) => this.#nameOf()(id)),
      this.query(),
      this.sorting(),
    ),
  );
  protected readonly columns = computed(() => {
    this.#messages();
    return attachColumns({
      name: this.#i18n.translate('campaign.party.columns.name'),
      ancestry: this.#i18n.translate('campaign.party.columns.ancestry'),
      class: this.#i18n.translate('campaign.party.columns.class'),
      level: this.#i18n.translate('campaign.party.columns.level'),
    });
  });
  protected readonly rowValue = attachValue;
  protected readonly rowLabel = attachLabel;

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
