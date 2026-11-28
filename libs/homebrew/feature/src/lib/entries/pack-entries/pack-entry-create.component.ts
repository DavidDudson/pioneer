import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AsyncButton, AsyncForm, Heading, injectTranslate, Stack, TextField } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import { HOMEBREW_ENTRY_KINDS } from '@pioneer/homebrew/domain';
import { ContentKind, Rarity } from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { injectOptionRows } from '@pioneer/rules/ui';

import { describeEntryError } from '../../data/entry-errors';
import { CreateEntryForm } from '../../data/entry-form';
import { KIND_MESSAGES, RARITY_MESSAGES } from '../../data/entry-messages';
import { HomebrewStore } from '../../data/homebrew-store';

interface CreateEntryModel {
  readonly kind: ContentKind;
  readonly name: string;
  readonly rarity: Rarity;
}

const NEW_ENTRY: CreateEntryModel = { kind: ContentKind.Feat, name: '', rarity: Rarity.Common };

/** A form to start an entry: pick its kind, name it and set its rarity. The rest of the entry starts from defaults. */
@Component({
  selector: 'pio-pack-entry-create',
  imports: [AsyncButton, AsyncForm, FormField, Heading, PickerField, Stack, TextField, TranslocoPipe],
  templateUrl: './pack-entry-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackEntryCreate {
  public readonly packId = input.required<ContentPackId>();

  readonly #store = inject(HomebrewStore);
  readonly #i18n = inject(TranslocoService);
  /** Ticks when the locale changes or the `homebrew` message scope finishes loading. */
  readonly #messages = injectTranslate();

  readonly #kindOptions = computed((): ReadonlyArray<SelectOption<ContentKind>> => {
    this.#messages();

    return HOMEBREW_ENTRY_KINDS.map((kind) => ({ value: kind, label: this.#i18n.translate(KIND_MESSAGES[kind]) }));
  });
  readonly #rarityOptions = computed((): ReadonlyArray<SelectOption<Rarity>> => {
    this.#messages();

    return Object.values(Rarity).map((rarity) => ({
      value: rarity,
      label: this.#i18n.translate(RARITY_MESSAGES[rarity]),
    }));
  });

  protected readonly kinds = injectOptionRows(this.#kindOptions);
  protected readonly rarities = injectOptionRows(this.#rarityOptions);

  protected readonly model = signal<CreateEntryModel>(NEW_ENTRY);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, CreateEntryForm);
  });

  protected readonly create = async (value: CreateEntryModel): Promise<void> => {
    const body = CreateEntryForm.parse(value);
    await this.#store.createEntry(this.packId(), { ...body, traits: [] });
    // Ready for the next one, in the same kind.
    this.form().reset({ ...NEW_ENTRY, kind: value.kind, rarity: value.rarity });
  };

  protected readonly describeCreateError = (error: Error): string =>
    describeEntryError(this.#i18n, error, 'homebrew.entry.createFailed');
}
