import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideUsers } from '@lucide/angular';
import type { Character } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncForm,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  EmptyState,
  Grid,
  Heading,
  Link,
  Page,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextField,
} from '@pioneer/frontier';
import { PickerField, VirtualItem, VirtualList } from '@pioneer/frontier/data';
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

/** Skeleton cards shown while the list loads. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

const characterKey = (character: Character): string => character.id;

@Component({
  selector: 'pio-character-list-page',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncForm,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    EmptyState,
    FormField,
    Grid,
    Heading,
    Link,
    Page,
    PickerField,
    Skeleton,
    Stack,
    Surface,
    Text,
    TextField,
    TranslocoPipe,
    VirtualItem,
    VirtualList,
  ],
  templateUrl: './character-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterListPage {
  protected readonly store = inject(CharacterStore);
  protected readonly ancestries = inject(AncestryOptions);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucideUsers;

  // Signal forms needs concrete field types, so "no ancestry yet" is ''.
  protected readonly model = signal<CreateModel>({ name: '', ancestry: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, CreateCharacterForm);
  });

  protected readonly create = async (value: CreateModel): Promise<void> => {
    const character = await this.store.create(CreateCharacterForm.parse(value));
    await this.#router.navigate([character.id], { relativeTo: this.#route });
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

  protected readonly characterKey = characterKey;
}
