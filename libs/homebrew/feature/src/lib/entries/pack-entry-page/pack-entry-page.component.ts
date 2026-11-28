import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AsyncButton,
  AsyncData,
  AsyncForm,
  AsyncPending,
  AsyncRegion,
  Heading,
  injectTranslate,
  Link,
  Page,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextField,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import type { HomebrewEntrySummary } from '@pioneer/homebrew/domain';
import { ContentId, Rarity } from '@pioneer/rules/sdk';
import { injectOptionRows } from '@pioneer/rules/ui';

import { describeEntryError } from '../../data/entry-errors';
import { EditEntryForm } from '../../data/entry-form';
import { KIND_MESSAGES, RARITY_MESSAGES } from '../../data/entry-messages';
import { HomebrewStore } from '../../data/homebrew-store';

interface EditEntryModel {
  readonly name: string;
  readonly rarity: Rarity;
}

/** Skeleton rows shown while the entries load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * One live entry's name and rarity, for its author to change. Its kind, slug and id are fixed; level and traits keep
 * the values they have. The entry comes from the pack's entry list, so an archived or unknown id reads as not found.
 */
@Component({
  selector: 'pio-pack-entry-page',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncForm,
    AsyncPending,
    AsyncRegion,
    FormField,
    Heading,
    Link,
    Page,
    PageBody,
    PageHeader,
    PickerField,
    Skeleton,
    Stack,
    Surface,
    Text,
    TextField,
    TranslocoPipe,
  ],
  templateUrl: './pack-entry-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackEntryPage {
  /** Route params, bound by `withComponentInputBinding`. */
  public readonly id = input.required<string>();
  public readonly entryId = input.required<string>();

  protected readonly store = inject(HomebrewStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);
  readonly #messages = injectTranslate();
  /** The entry the form was last filled from. */
  readonly #filledFor = signal<ContentId | undefined>(undefined);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly kindMessages = KIND_MESSAGES;

  /** The entry being edited, once the list has it. */
  protected readonly entry = computed((): HomebrewEntrySummary | undefined => {
    const wanted = ContentId.safeParse(this.entryId());

    return wanted.success ? this.store.entries.data()?.find((candidate) => candidate.id === wanted.data) : undefined;
  });

  protected readonly rarityOptions = computed((): ReadonlyArray<SelectOption<Rarity>> => {
    this.#messages();

    return Object.values(Rarity).map((rarity) => ({
      value: rarity,
      label: this.#i18n.translate(RARITY_MESSAGES[rarity]),
    }));
  });
  protected readonly rarities = injectOptionRows(this.rarityOptions);

  protected readonly model = signal<EditEntryModel>({ name: '', rarity: Rarity.Common });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, EditEntryForm);
  });

  public constructor() {
    effect(() => {
      this.store.select(this.id());
      this.store.showArchived.set(false);
    });
    // Fill the form once per entry: later refreshes, and typing, must not overwrite what is being edited.
    effect(() => {
      const entry = this.entry();

      if (entry !== undefined && untracked(this.#filledFor) !== entry.id) {
        this.#filledFor.set(entry.id);
        this.model.set({ name: entry.name, rarity: entry.rarity });
      }
    });
  }

  protected readonly save = async (value: EditEntryModel): Promise<void> => {
    const entry = this.entry();

    if (entry === undefined) {
      return;
    }

    const changes = EditEntryForm.parse(value);
    await this.store.updateEntry(entry.packId, entry.id, {
      ...changes,
      level: entry.level,
      traits: entry.traits,
    });
    await this.#router.navigate(['../..'], { relativeTo: this.#route });
  };

  protected readonly describeSaveError = (error: Error): string =>
    describeEntryError(this.#i18n, error, 'homebrew.entry.saveFailed');
}
