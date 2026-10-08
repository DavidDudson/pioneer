import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { CharacterNameSchema } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncForm,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  Grid,
  Heading,
  Link,
  Page,
  SelectField,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextField,
} from '@pioneer/frontier';
import { VirtualItem, VirtualList } from '@pioneer/frontier/data';
import { AncestryId } from '@pioneer/rules/sdk';
import { z } from 'zod';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterStore } from '../../data/character-store';

const CreateForm = z.object({ name: CharacterNameSchema, ancestry: AncestryId });
interface CreateModel {
  readonly name: string;
  readonly ancestry: string;
}

/** Skeleton cards shown while the list loads. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

const describeCreateError = (): string => 'Could not create the character. Try again.';
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
    FormField,
    Grid,
    Heading,
    Link,
    Page,
    SelectField,
    Skeleton,
    Stack,
    Surface,
    Text,
    TextField,
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

  // Signal forms needs concrete field types, so "no ancestry yet" is ''.
  protected readonly model = signal<CreateModel>({ name: '', ancestry: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, CreateForm);
  });

  protected readonly create = async (value: CreateModel): Promise<void> => {
    const character = await this.store.create(CreateForm.parse(value));
    await this.#router.navigate([character.id], { relativeTo: this.#route });
  };

  protected readonly describeCreateError = describeCreateError;

  protected readonly characterKey = characterKey;
}
