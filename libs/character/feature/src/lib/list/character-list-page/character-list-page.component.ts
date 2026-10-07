import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, submit, validateStandardSchema } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { CharacterNameSchema } from '@pioneer/character/domain';
import {
  Button,
  DateDisplay,
  Grid,
  Link,
  Page,
  Select,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextInput,
} from '@pioneer/frontier';
import { AncestryId } from '@pioneer/rules/sdk';
import { z } from 'zod';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterStore } from '../../data/character-store';

const CreateForm = z.object({ name: CharacterNameSchema, ancestry: AncestryId });

@Component({
  selector: 'pio-character-list-page',
  imports: [
    Button,
    DateDisplay,
    FormField,
    Grid,
    Link,
    Page,
    RouterLink,
    Select,
    Skeleton,
    Stack,
    Surface,
    Text,
    TextInput,
  ],
  templateUrl: './character-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterListPage {
  protected readonly store = inject(CharacterStore);
  protected readonly ancestries = inject(AncestryOptions);
  readonly #router = inject(Router);

  // Signal forms needs concrete field types, so "no ancestry yet" is ''.
  protected readonly model = signal({ name: '', ancestry: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, CreateForm);
  });

  protected async create(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      const character = await this.store.create(CreateForm.parse(this.model()));
      await this.#router.navigate([character.id]);
      return undefined;
    });
  }
}
