import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, EmptyState, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ComboboxField } from '@pioneer/frontier/data';
import { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { CharacterStore } from '../../data/character-store';
import { spellMatches } from '../sheet-prepared-spells';
import type { SheetSpellAccess } from '../sheet-prepared-spells';

/** What the add form submits: a spell, by the id the server validates. */
const GrantForm = z.object({ spell: ContentId });

/** The form's model; signal forms need a concrete type, so "no spell yet" is ''. */
interface GrantModel {
  readonly spell: string;
}

const NO_SPELL: GrantModel = { spell: '' };

/**
 * The uncommon and rare spells the character has access to (#478), each with Remove, and a picker to add one of its
 * traditions. A spell taken out stays in any slot it was prepared in, flagged there, until it comes back or is
 * replaced.
 */
@Component({
  selector: 'pio-spell-access',
  imports: [
    AsyncButton,
    AsyncForm,
    ComboboxField,
    EmptyState,
    FormField,
    Heading,
    List,
    ListItem,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './spell-access.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellAccess {
  public readonly access = input.required<SheetSpellAccess>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);
  readonly #query = signal('');

  protected readonly model = signal<GrantModel>(NO_SPELL);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, GrantForm);
  });

  protected readonly spells: Signal<readonly SelectOption<string>[]> = computed(() =>
    spellMatches(this.access().offered, this.#query()),
  );

  protected search(query: string): void {
    this.#query.set(query);
  }

  protected readonly grant = async (value: GrantModel): Promise<void> => {
    const { spell } = GrantForm.parse(value);
    await this.#store.patch({ field: CharacterPatchField.GrantSpellAccess, spell });
    this.model.set(NO_SPELL);
  };

  protected revoke(spell: ContentId): () => Promise<void> {
    return async (): Promise<void> => {
      await this.#store.patch({ field: CharacterPatchField.RevokeSpellAccess, spell });
    };
  }

  protected readonly describeError = (): string => this.#i18n.translate('character.sheet.spellAccess.addFailed');
}
