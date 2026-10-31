import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, OverrideInput, OverrideMode, OverrideModifierType } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncForm,
  LocaleFormat,
  NumberField,
  SegmentedField,
  Stack,
  Text,
  TextAreaField,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { Modifier, ModifierType } from '@pioneer/rules/sdk';
import { MODIFIER_TYPE_MESSAGES, numberStyle } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { describeSaveError } from '../sheet-field';
import type { OverrideTarget } from './sheet-override';

/** What the form holds while it is filled in. */
interface OverrideModel {
  readonly value: number;
  readonly type: OverrideModifierType;
  readonly reason: string;
}

const EMPTY: OverrideModel = { value: 0, type: ModifierType.Untyped, reason: '' };

/** What the form opens with: the override being edited, else nothing. */
function modelOf({ existing }: OverrideTarget): OverrideModel {
  return existing === undefined
    ? EMPTY
    : { value: existing.value, type: existing.type ?? ModifierType.Untyped, reason: existing.reason };
}

/** The part of an override the form gives; the rest is the statistic and the mode it was opened for. */
const FormInput = OverrideInput.pick({ value: true, type: true, reason: true });

/** Message keys the form renders with, spelled out so the key check sees them. */
const Message = {
  TitleAdjust: 'character.sheet.override.titleAdjust',
  TitleSet: 'character.sheet.override.titleSet',
  AmountAdjust: 'character.sheet.override.amountAdjust',
  AmountSet: 'character.sheet.override.amountSet',
  Current: 'character.sheet.override.current',
  Type: 'character.sheet.override.type',
  Reason: 'character.sheet.override.reason',
  ReasonRequired: 'character.validation.overrideReasonRequired',
  ReasonHint: 'character.sheet.override.reasonHint',
  Submit: 'character.sheet.override.submit',
  SubmitEdit: 'character.sheet.override.submitEdit',
  Pending: 'character.sheet.override.pending',
  Done: 'character.sheet.override.done',
} as const;

/**
 * The form that adds an override to one statistic: an amount (a typed modifier to add, or the value to pin), and the
 * reason, which is required. Submit stays off while the form is invalid, with the reason's error read out under the
 * field. The statistic's current total shows with the form, so the author sees what they are changing.
 */
@Component({
  selector: 'pio-sheet-override-form',
  imports: [AsyncButton, AsyncForm, FormField, NumberField, SegmentedField, Stack, Text, TextAreaField, TranslocoPipe],
  templateUrl: './sheet-override-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetOverrideForm {
  public readonly target = input.required<OverrideTarget>();
  /** Fires once the override is saved, so the drawer around the form can close. */
  public readonly saved = output();

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);

  protected readonly Message = Message;
  protected readonly isAdjust = computed(() => this.target().mode === OverrideMode.Adjust);
  protected readonly title = computed(() =>
    this.#i18n.translate(this.isAdjust() ? Message.TitleAdjust : Message.TitleSet, {
      name: this.target().statistic.name,
    }),
  );
  /** "Currently +7": the total as it stands, worded for its kind. */
  protected readonly current = computed(() => {
    const { statistic } = this.target();
    const { result, kind } = statistic;
    return result.ok
      ? this.#i18n.translate(Message.Current, { total: this.#format.number(result.total, numberStyle(kind)) })
      : undefined;
  });
  protected readonly types: readonly SelectOption<OverrideModifierType>[] = OverrideModifierType.options.map(
    (type): SelectOption<OverrideModifierType> => ({
      value: type,
      label: this.#i18n.translate(MODIFIER_TYPE_MESSAGES[type]),
    }),
  );

  protected readonly model = linkedSignal((): OverrideModel => modelOf(this.target()));
  protected readonly editing = computed(() => this.target().existing !== undefined);
  /** Why the reason is not accepted, once the author has touched it: submit is off until it is given. */
  protected readonly reasonError = computed((): string | undefined => {
    const reason = this.form.reason();
    const blank = this.model().reason.trim() === '';
    return blank && (reason.touched() || reason.dirty()) ? this.#i18n.translate(Message.ReasonRequired) : undefined;
  });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, FormInput);
  });

  protected readonly save = async ({ value, type, reason }: OverrideModel): Promise<void> => {
    const { selector, mode, existing } = this.target();
    const override = OverrideInput.parse({
      target: selector,
      mode,
      value: Modifier.parse(value),
      ...(mode === OverrideMode.Adjust ? { type } : {}),
      reason,
    });
    await this.#store.patch(
      existing === undefined
        ? { field: CharacterPatchField.AddOverride, override }
        : { field: CharacterPatchField.EditOverride, id: existing.id, override },
    );
    this.form().reset(existing === undefined ? EMPTY : { value, type, reason });
    this.saved.emit();
  };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
