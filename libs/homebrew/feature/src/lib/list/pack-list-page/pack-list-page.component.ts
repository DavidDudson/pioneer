import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AsyncButton,
  AsyncData,
  AsyncForm,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  Heading,
  Link,
  Page,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextField,
} from '@pioneer/frontier';
import { VirtualItem, VirtualList } from '@pioneer/frontier/data';
import type { HomebrewPack } from '@pioneer/homebrew/domain';

import { CreatePackForm } from '../../data/create-pack-form';
import { HomebrewStore } from '../../data/homebrew-store';

interface CreateModel {
  readonly title: string;
  readonly slug: string;
}

/** Skeleton cards shown while the list loads. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

const packKey = (pack: HomebrewPack): string => pack.id;

/** The user's homebrew packs, and a form to start one. */
@Component({
  selector: 'pio-pack-list-page',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncForm,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    FormField,
    Heading,
    Link,
    Page,
    Skeleton,
    Stack,
    Surface,
    Text,
    TextField,
    TranslocoPipe,
    VirtualItem,
    VirtualList,
  ],
  templateUrl: './pack-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackListPage {
  protected readonly store = inject(HomebrewStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);

  protected readonly placeholders = PLACEHOLDERS;

  protected readonly model = signal<CreateModel>({ title: '', slug: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, CreatePackForm);
  });

  protected readonly create = async (value: CreateModel): Promise<void> => {
    const pack = await this.store.create(CreatePackForm.parse(value));
    await this.#router.navigate([pack.id], { relativeTo: this.#route });
  };

  protected readonly describeCreateError = (): string => this.#i18n.translate('homebrew.list.createFailed');

  protected readonly packKey = packKey;
}
