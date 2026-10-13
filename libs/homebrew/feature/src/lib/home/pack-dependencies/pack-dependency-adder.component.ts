import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AsyncButton, AsyncForm, Stack, Text } from '@pioneer/frontier';
import { PickerField, tableSchema } from '@pioneer/frontier/data';
import type { TableColumn } from '@pioneer/frontier/data';
import { AddPackDependencyBody } from '@pioneer/homebrew/domain';
import type { PackSummary } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';

import { HomebrewStore } from '../../data/homebrew-store';

/** A pack's value in the picker. */
function packValue(pack: PackSummary): string {
  return pack.id;
}

/** What the picker shows for the picked pack. */
function packLabel(pack: PackSummary): string {
  return pack.title;
}

interface AddModel {
  readonly dependsOn: string;
}

/**
 * Picks one of the packs the owner could add and adds it. The server refuses what would break the pack's references
 * (a cycle, a pack visible to more people than what it extends) and its reason shows beside the control.
 */
@Component({
  selector: 'pio-pack-dependency-adder',
  imports: [AsyncButton, AsyncForm, FormField, PickerField, Stack, Text, TranslocoPipe],
  templateUrl: './pack-dependency-adder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackDependencyAdder {
  public readonly packId = input.required<ContentPackId>();
  public readonly candidates = input.required<readonly PackSummary[]>();

  readonly #store = inject(HomebrewStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly query = signal('');
  /** The candidates whose title or author contains what was typed in the picker. */
  protected readonly matching = computed((): readonly PackSummary[] => {
    const typed = this.query().trim().toLowerCase();
    return typed === ''
      ? this.candidates()
      : this.candidates().filter((pack) => `${pack.title} ${pack.publisher}`.toLowerCase().includes(typed));
  });

  protected readonly columns = computed((): readonly TableColumn<PackSummary>[] =>
    tableSchema<PackSummary>()
      .addText({
        id: 'title',
        header: this.#i18n.translate('homebrew.dependencies.titleColumn'),
        value: (pack) => pack.title,
        sortable: false,
      })
      .addText({
        id: 'publisher',
        header: this.#i18n.translate('homebrew.dependencies.publisherColumn'),
        value: (pack) => pack.publisher,
        sortable: false,
      })
      .build(),
  );
  protected readonly rowValue = packValue;
  protected readonly rowLabel = packLabel;

  protected readonly model = signal<AddModel>({ dependsOn: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, AddPackDependencyBody);
  });

  protected readonly add = async (value: AddModel): Promise<void> => {
    const { dependsOn } = AddPackDependencyBody.parse(value);
    await this.#store.addDependency(this.packId(), dependsOn);
    // The pack is a dependency now and out of the picker: ready for the next.
    this.form().reset({ dependsOn: '' });
    this.query.set('');
  };

  /** The server's own reason when it gave one the viewer can act on (a 409), else a general failure. */
  protected readonly describeAddError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('homebrew.dependencies.addFailed');
  };
}
