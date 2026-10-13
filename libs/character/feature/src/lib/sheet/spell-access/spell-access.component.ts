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
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField } from '@pioneer/character/domain';
import { AsyncButton, AsyncForm, Heading, Stack } from '@pioneer/frontier';
import { PickerField } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { ContentId } from '@pioneer/rules/sdk';
import {
  shownSpellRows,
  SpellAccessListView,
  spellPickerColumns,
  spellRowDisabled,
  spellRowLabel,
  spellRowValue,
} from '@pioneer/rules/ui';
import type { RemoveSpellAccess, SpellPickerRow } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';
import * as z from 'zod';

import { CharacterStore } from '../../data/character-store';
import { describeSaveError } from '../sheet-field';
import type { SheetSpellAccess } from '../sheet-prepared-spells';
import { spellRows } from '../sheet-spell-rows';

const NONE_TAKEN: ReadonlySet<ContentId> = new Set();

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
  imports: [AsyncButton, AsyncForm, FormField, Heading, PickerField, SpellAccessListView, Stack, TranslocoPipe],
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
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the headers and labels are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);

  protected readonly model = signal<GrantModel>(NO_SPELL);
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, GrantForm);
  });

  protected readonly columns = computed(() => {
    this.#messages();
    return spellPickerColumns((key) => this.#i18n.translate(key));
  });

  /** The spells the character may add, as rows narrowed by what was typed, in the order asked for. */
  protected readonly shown: Signal<readonly SpellPickerRow[]> = computed(() => {
    this.#messages();
    const rows = spellRows(this.access()?.offered ?? [], {
      translate: (key) => this.#i18n.translate(key),
      castRank: undefined,
      taken: NONE_TAKEN,
    });
    return shownSpellRows(rows, this.query(), this.sorting());
  });

  protected readonly rowValue = spellRowValue;
  protected readonly rowLabel = spellRowLabel;
  protected readonly rowDisabled = spellRowDisabled;

  protected readonly grant = async (value: GrantModel): Promise<void> => {
    const { spell } = GrantForm.parse(value);
    await this.#store.patch({ field: CharacterPatchField.GrantSpellAccess, spell });
    this.model.set(NO_SPELL);
  };

  protected readonly revoke: RemoveSpellAccess = async (spell) => {
    await this.#store.patch({ field: CharacterPatchField.RevokeSpellAccess, spell: ContentId.parse(spell) });
    afterNextRender(
      () => {
        this.#host.nativeElement.querySelector<HTMLElement>('fr-picker-field button[aria-haspopup="grid"]')?.focus();
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
