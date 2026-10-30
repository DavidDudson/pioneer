import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucidePackagePlus } from '@lucide/angular';
import { EnablePackBody } from '@pioneer/character/domain';
import type { PackCandidate } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, EmptyState, Heading, Link, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { injectOptionRows } from '@pioneer/rules/ui';
import { ApiError } from '@pioneer/shared/web';

import { CharacterPackStore } from '../../data/character-pack-store';

interface EnableModel {
  readonly packId: string;
}

/** The packs the owner may read that the character does not use, to enable one, with the packs it extends. */
@Component({
  selector: 'pio-sheet-pack-picker',
  imports: [AsyncButton, AsyncForm, EmptyState, FormField, Heading, Link, PickerField, Stack, TranslocoPipe],
  templateUrl: './sheet-pack-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPackPicker {
  public readonly candidates = input.required<readonly PackCandidate[]>();
  /** A pack was enabled from here. */
  public readonly enabled = output<ContentPackId>();

  readonly #store = inject(CharacterPackStore);
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
      label: pack.private ? this.#i18n.translate('character.packs.privateOption', { title: pack.title }) : pack.title,
    })),
  );

  protected readonly table = injectOptionRows(this.options);

  protected readonly model = signal<EnableModel>({ packId: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, EnablePackBody);
  });

  protected readonly enable = async (value: EnableModel): Promise<void> => {
    const { packId } = EnablePackBody.parse(value);
    await this.#store.enable(packId);
    // The pack is in use now and out of the picker: ready for the next.
    this.form().reset({ packId: '' });
    this.#enabledHere.set(true);
    this.enabled.emit(packId);
  };

  /** A pack that cannot be used says why; anything else is a retry. */
  protected readonly describeEnableError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('character.packs.enableFailed');
  };
}
