import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { KeyPropertyRune, ReviewedRuneId } from '@pioneer/campaign/domain';
import { AsyncButton, AsyncForm, Heading, Stack, TextAreaField, TextField } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import { injectOptionColumns, injectOptionRows, optionLabel, optionValue } from '@pioneer/rules/ui';

import { CampaignKeyItemStore } from '../../data/campaign-key-item-store';
import { KEY_ITEM_CONTENT_SEARCH } from '../../data/key-item-content-search';
import type { ContentChoice } from '../../data/key-item-content-search';
import {
  EMPTY_KEY_ITEM,
  KeyItemForm,
  NO_GRADE,
  REINFORCING_GRADES,
  RUNE_GRADES,
  toCreateBody,
} from '../../data/key-item-form';
import type { KeyItemModel } from '../../data/key-item-form';
import { CampaignKeyItemRunes } from '../campaign-key-item-runes/campaign-key-item-runes.component';

/**
 * The GM creates a key item: its name, the base item picked from the rules content, the runes as they state them (the
 * table's caps do not bind a key item) and notes. It starts in the party stash, until the GM gives it to a character.
 */
@Component({
  selector: 'pio-campaign-key-item-form',
  imports: [
    AsyncButton,
    AsyncForm,
    CampaignKeyItemRunes,
    PickerField,
    FormField,
    Heading,
    Stack,
    TextAreaField,
    TextField,
    TranslocoPipe,
  ],
  templateUrl: './campaign-key-item-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignKeyItemForm {
  readonly #store = inject(CampaignKeyItemStore);
  readonly #search = inject(KEY_ITEM_CONTENT_SEARCH);
  readonly #i18n = inject(TranslocoService);
  readonly #found = signal<readonly ContentChoice[]>([]);

  protected readonly model = signal<KeyItemModel>(EMPTY_KEY_ITEM);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, KeyItemForm);
  });
  protected readonly property = signal<readonly KeyPropertyRune[]>([]);
  protected readonly loading = signal(false);
  protected readonly baseOptions = computed((): readonly SelectOption<ReviewedRuneId>[] =>
    this.#found().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly gradeOptions = computed(() => this.#grades(RUNE_GRADES));
  protected readonly reinforcingOptions = computed(() => this.#grades(REINFORCING_GRADES));
  /** The base item is searched at the source; each grade is a short list held whole. */
  protected readonly baseColumns = injectOptionColumns<ReviewedRuneId>();
  protected readonly baseValue = optionValue<ReviewedRuneId>;
  protected readonly baseLabel = optionLabel;
  protected readonly potency = injectOptionRows(this.gradeOptions);
  protected readonly striking = injectOptionRows(this.gradeOptions);
  protected readonly resilient = injectOptionRows(this.gradeOptions);
  protected readonly reinforcing = injectOptionRows(this.reinforcingOptions);

  protected async find(words: string): Promise<void> {
    this.loading.set(true);
    try {
      this.#found.set(await this.#search.items(words));
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly create = async (value: KeyItemModel): Promise<void> => {
    const base = this.#found().find(({ id }) => id === value.base);
    if (base === undefined) {
      throw new Error('No base item picked');
    }
    await this.#store.create(toCreateBody(value, { item: base.id, name: base.name }, this.property()));
    this.form().reset(EMPTY_KEY_ITEM);
    this.property.set([]);
  };

  protected readonly describeError = (): string => this.#i18n.translate('campaign.keyItems.form.createFailed');

  /** "None", then each grade as the rules write it. */
  #grades<TGrade extends string>(grades: readonly TGrade[]): readonly SelectOption<typeof NO_GRADE | TGrade>[] {
    return [
      { value: NO_GRADE, label: this.#i18n.translate('campaign.keyItems.form.noGrade') },
      ...grades.map((grade) => ({
        value: grade,
        label: this.#i18n.translate('campaign.keyItems.form.grade', { grade }),
      })),
    ];
  }
}
