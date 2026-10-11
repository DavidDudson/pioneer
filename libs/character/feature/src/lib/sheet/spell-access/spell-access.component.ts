import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Heading, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ComboboxField } from '@pioneer/frontier/data';
import { ContentId } from '@pioneer/rules/sdk';
import { SpellAccessListView } from '@pioneer/rules/ui';
import type { RemoveSpellAccess } from '@pioneer/rules/ui';
import * as z from 'zod';

import { CharacterStore } from '../../data/character-store';
import { describeSaveError } from '../sheet-field';
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
 * The uncommon, rare and unique spells the character has access to (#478), each with Remove, and a picker to add one
 * of its traditions. A spell taken out stays in any slot it was prepared in, flagged there, until it comes back or is
 * replaced. After Remove, focus moves to the spell picker, never to the page.
 */
@Component({
  selector: 'pio-spell-access',
  imports: [AsyncButton, AsyncForm, ComboboxField, FormField, Heading, SpellAccessListView, Stack, TranslocoPipe],
  templateUrl: './spell-access.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellAccess {
  /** Undefined while the spells load. */
  public readonly access = input<SheetSpellAccess | undefined>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);
  readonly #query = signal('');

  protected readonly model = signal<GrantModel>(NO_SPELL);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, GrantForm);
  });

  protected readonly spells: Signal<readonly SelectOption<string>[]> = computed(() =>
    spellMatches(this.access()?.offered ?? [], this.#query()),
  );

  protected search(query: string): void {
    this.#query.set(query);
  }

  protected readonly grant = async (value: GrantModel): Promise<void> => {
    const { spell } = GrantForm.parse(value);
    await this.#store.patch({ field: CharacterPatchField.GrantSpellAccess, spell });
    this.model.set(NO_SPELL);
  };

  protected readonly revoke: RemoveSpellAccess = async (spell) => {
    await this.#store.patch({ field: CharacterPatchField.RevokeSpellAccess, spell: ContentId.parse(spell) });
    afterNextRender(
      () => {
        this.#host.nativeElement.querySelector<HTMLElement>('input[role="combobox"]')?.focus();
      },
      { injector: this.#injector },
    );
  };

  /** The server's reason (a common spell, a full list, a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
