import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, OverrideReason } from '@pioneer/character/domain';
import { AsyncButton, BadgeTone, DateDisplay, Stack, Tag, Text, TextField } from '@pioneer/frontier';
import * as z from 'zod';

import { CharacterStore } from '../../data/character-store';
import { describeSaveError } from '../sheet-field';
import type { CustomEffectRow } from './sheet-custom-effect-rows';

/** What removing asks for: why the effect is going. */
const RemoveInput = z.object({ reason: OverrideReason });

/** Message keys the row renders with, spelled out so the key check sees them. */
const Message = {
  On: 'character.sheet.customEffects.on',
  Off: 'character.sheet.customEffects.off',
  GmTag: 'character.sheet.overrides.gmTag',
  GmLocked: 'character.sheet.customEffects.gmLocked',
  UnknownUser: 'character.sheet.overrides.unknownUser',
  AddedBy: 'character.sheet.customEffects.addedBy',
  Line: 'character.sheet.customEffects.line',
  SwitchOff: 'character.sheet.customEffects.switchOff',
  SwitchOffLabel: 'character.sheet.customEffects.switchOffLabel',
  SwitchOn: 'character.sheet.customEffects.switchOn',
  SwitchOnLabel: 'character.sheet.customEffects.switchOnLabel',
  Switching: 'character.sheet.customEffects.switching',
  History: 'character.sheet.customEffects.history',
  Switched: 'character.sheet.customEffects.switched',
  Remove: 'character.sheet.customEffects.remove',
  RemoveLabel: 'character.sheet.customEffects.removeLabel',
  RemoveConfirm: 'character.sheet.customEffects.removeConfirm',
  Removing: 'character.sheet.customEffects.removing',
  RemoveReason: 'character.sheet.customEffects.removeReason',
  RemoveReasonHint: 'character.sheet.customEffects.removeReasonHint',
} as const;

/**
 * One custom effect in the list: its name and whether it is on, its reason, each line, who added it, and the switches
 * it has had. Switching it flips every line together. Remove needs a reason and a second press that names the effect
 * (interaction rule 4); the effect stays on the record, marked removed.
 */
@Component({
  selector: 'pio-sheet-custom-effect-row',
  imports: [AsyncButton, DateDisplay, FormField, Stack, Tag, Text, TextField, TranslocoPipe],
  templateUrl: './sheet-custom-effect-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCustomEffectRow {
  public readonly row = input.required<CustomEffectRow>();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly Message = Message;
  protected readonly Tone = BadgeTone;
  protected readonly model = signal({ reason: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, RemoveInput);
  });

  protected readonly toggle = async (): Promise<void> => {
    const { effect } = this.row();
    await this.#store.patch({
      field: CharacterPatchField.ToggleCustomEffect,
      id: effect.id,
      enabled: !effect.enabled,
    });
  };

  protected readonly remove = async (): Promise<void> => {
    await this.#store.patch({
      field: CharacterPatchField.RemoveCustomEffect,
      id: this.row().effect.id,
      reason: OverrideReason.parse(this.model().reason),
    });
  };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
