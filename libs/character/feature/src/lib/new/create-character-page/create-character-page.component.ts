import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AsyncButton,
  AsyncForm,
  Grid,
  Heading,
  Page,
  PageBody,
  PageHeader,
  Stack,
  Surface,
  TextField,
} from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import {
  ancestryPickerColumns,
  originRowDisabled,
  originRowLabel,
  originRowValue,
  shownAncestryRows,
} from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterStore } from '../../data/character-store';
import { CreateCharacterForm } from '../../data/create-character-form';

interface CreateModel {
  readonly name: string;
  readonly ancestry: string;
}

/** The name and ancestry form that makes a character; the level 1 stepper replaces it. */
@Component({
  selector: 'pio-create-character-page',
  imports: [
    AsyncButton,
    AsyncForm,
    FormField,
    Grid,
    Heading,
    Page,
    PageBody,
    PageHeader,
    PickerField,
    Stack,
    Surface,
    TextField,
    TranslocoPipe,
  ],
  templateUrl: './create-character-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCharacterPage {
  protected readonly store = inject(CharacterStore);
  protected readonly ancestries = inject(AncestryOptions);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  // Signal forms needs concrete field types, so "no ancestry yet" is ''.
  protected readonly model = signal<CreateModel>({ name: '', ancestry: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, CreateCharacterForm);
  });

  protected readonly create = async (value: CreateModel): Promise<void> => {
    const character = await this.store.create(CreateCharacterForm.parse(value));
    // The page is `/characters/new/create`, so the sheet is two levels up.
    await this.#router.navigate(['../..', character.id], { relativeTo: this.#route });
  };

  readonly #i18n = inject(TranslocoService);
  protected readonly describeCreateError = (): string => this.#i18n.translate('character.list.createFailed');

  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the picker's headers are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);
  protected readonly columns = computed(() => {
    this.#messages();
    return ancestryPickerColumns((key, params) => this.#i18n.translate(key, params));
  });
  protected readonly shown = computed(() => shownAncestryRows(this.ancestries.rows(), this.query(), this.sorting()));
  protected readonly rowValue = originRowValue;
  protected readonly rowLabel = originRowLabel;
  protected readonly rowDisabled = originRowDisabled;
}
