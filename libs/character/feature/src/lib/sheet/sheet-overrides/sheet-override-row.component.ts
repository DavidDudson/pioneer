import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, OverrideReason } from '@pioneer/character/domain';
import { AsyncButton, DateDisplay, Link, Stack, Text, TextField } from '@pioneer/frontier';
import type { StatisticLink } from '@pioneer/rules/ui';
import * as z from 'zod';

import { CharacterStore } from '../../data/character-store';
import { describeSaveError } from '../sheet-field';
import { SheetOverrides } from '../sheet-override/sheet-override';
import type { OverrideRow } from './sheet-override-rows';

/** What removing asks for: why the override is going. */
const RemoveInput = z.object({ reason: OverrideReason });

/** Message keys the row renders with, spelled out so the key check sees them. */
const Message = {
  SetBy: 'character.sheet.overrides.setBy',
  UnknownUser: 'character.sheet.overrides.unknownUser',
  History: 'character.sheet.overrides.history',
  Earlier: 'character.sheet.overrides.earlier',
  Edit: 'character.sheet.overrides.edit',
  EditLabel: 'character.sheet.overrides.editLabel',
  Remove: 'character.sheet.overrides.remove',
  RemoveLabel: 'character.sheet.overrides.removeLabel',
  RemoveConfirm: 'character.sheet.overrides.removeConfirm',
  Removing: 'character.sheet.overrides.removing',
  RemoveReason: 'character.sheet.overrides.removeReason',
  RemoveReasonHint: 'character.sheet.overrides.removeReasonHint',
} as const;

/**
 * One override in the list: the statistic, what it does, its reason and author, and the earlier states edits replaced,
 * so who changed it and why stays visible. Edit opens the override in the drawer. Remove needs a reason, and asks for a
 * second press that names the statistic (interaction rule 4); the override stays on the record, marked removed.
 */
@Component({
  selector: 'pio-sheet-override-row',
  imports: [AsyncButton, DateDisplay, FormField, Link, Stack, Text, TextField, TranslocoPipe],
  templateUrl: './sheet-override-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetOverrideRow {
  public readonly row = input.required<OverrideRow>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);
  readonly #overrides = inject(SheetOverrides);

  protected readonly Message = Message;
  protected readonly editLink = computed((): StatisticLink => this.#overrides.edit(this.row().override.id));
  protected readonly model = signal({ reason: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, RemoveInput);
  });

  protected readonly remove = async (): Promise<void> => {
    await this.#store.patch({
      field: CharacterPatchField.RemoveOverride,
      id: this.row().override.id,
      reason: OverrideReason.parse(this.model().reason),
    });
  };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
