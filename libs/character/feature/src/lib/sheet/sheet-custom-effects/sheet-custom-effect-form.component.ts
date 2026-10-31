import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CharacterPatchField,
  CUSTOM_EFFECT_LINES_MAX,
  CustomEffectInput,
  CustomEffectLine,
  OverrideModifierType,
} from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncForm,
  Button,
  LocaleFormat,
  NumberField,
  SegmentedField,
  Stack,
  Text,
  TextAreaField,
  TextField,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { Modifier, ModifierType, Selector } from '@pioneer/rules/sdk';
import { MODIFIER_TYPE_MESSAGES, OptionPicker } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';
import { namedStatistics, SHEET_STATISTICS } from '../sheet-statistics';

/** What the form holds while it is filled in: the effect's name and reason, and the line being written. */
interface EffectModel {
  readonly name: string;
  readonly reason: string;
  readonly target: string;
  readonly value: number;
  readonly type: OverrideModifierType;
}

const EMPTY: EffectModel = { name: '', reason: '', target: '', value: 0, type: ModifierType.Untyped };

/** The part of the effect the form's fields give; its lines are the ones added so far. */
const FormInput = CustomEffectInput.pick({ name: true, reason: true });

/** Message keys the form renders with, spelled out so the key check sees them. */
const Message = {
  Name: 'character.sheet.customEffects.form.name',
  Reason: 'character.sheet.customEffects.form.reason',
  ReasonHint: 'character.sheet.customEffects.form.reasonHint',
  Statistic: 'character.sheet.customEffects.form.statistic',
  Amount: 'character.sheet.customEffects.form.amount',
  Type: 'character.sheet.customEffects.form.type',
  AddLine: 'character.sheet.customEffects.form.addLine',
  Lines: 'character.sheet.customEffects.form.lines',
  LinesRequired: 'character.validation.customEffectLinesRequired',
  RemoveLine: 'character.sheet.customEffects.form.removeLine',
  RemoveLineLabel: 'character.sheet.customEffects.form.removeLineLabel',
  LineWords: 'character.sheet.customEffects.line',
  EffectAdjust: 'character.sheet.overrides.effectAdjust',
  Submit: 'character.sheet.customEffects.form.submit',
  Pending: 'character.sheet.customEffects.form.pending',
  Done: 'character.sheet.customEffects.form.done',
} as const;

/**
 * The form that adds a custom effect: a name, the one reason it carries, and its lines, each a typed modifier on a
 * statistic. Lines are written one at a time and listed above the fields; the effect can be added once it has a name, a
 * reason and at least one line, and it starts switched on.
 */
@Component({
  selector: 'pio-sheet-custom-effect-form',
  imports: [
    AsyncButton,
    AsyncForm,
    Button,
    FormField,
    NumberField,
    OptionPicker,
    SegmentedField,
    Stack,
    Text,
    TextAreaField,
    TextField,
    TranslocoPipe,
  ],
  templateUrl: './sheet-custom-effect-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCustomEffectForm {
  readonly #store = inject(CharacterStore);
  readonly #sheet = inject(SheetState);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);

  protected readonly Message = Message;
  protected readonly types: readonly SelectOption<OverrideModifierType>[] = OverrideModifierType.options.map(
    (type): SelectOption<OverrideModifierType> => ({
      value: type,
      label: this.#i18n.translate(MODIFIER_TYPE_MESSAGES[type]),
    }),
  );
  /** The statistics a line can aim at, named as the sheet names them. */
  protected readonly statistics = computed((): readonly SelectOption<string>[] => {
    const registry = this.#sheet.engine();
    const character = this.#sheet.character();
    if (registry === undefined || character === undefined) {
      return [];
    }
    const named = namedStatistics(registry, character, SHEET_STATISTICS);
    return [...named].map(([selector, found]) => ({
      value: selector,
      label: found.nameKey === undefined ? found.name : this.#i18n.translate(found.nameKey),
    }));
  });

  protected readonly model = signal<EffectModel>(EMPTY);
  /** The lines added so far. */
  protected readonly lines = signal<readonly CustomEffectLine[]>([]);
  /** Each added line in words, beside the button that takes it back out. */
  protected readonly shownLines = computed(() =>
    this.lines().map((line) => ({
      line,
      words: this.#i18n.translate(Message.LineWords, {
        statistic: this.#statisticName(line.target),
        effect: this.#effect(line),
      }),
    })),
  );
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, FormInput);
  });

  /** The statistic picked for the line being written, if any. */
  protected readonly target = computed(() => this.model().target || undefined);

  protected readonly pickTarget = (target: string | undefined): void => {
    this.model.update((model) => ({ ...model, target: target ?? '' }));
  };

  /** The line being written, once its statistic and amount make a valid one. */
  readonly #pendingLine = computed((): CustomEffectLine | undefined => {
    const { target, value, type } = this.model();
    const parsedTarget = Selector.safeParse(target);
    const parsedValue = Modifier.safeParse(value);
    if (!parsedTarget.success || !parsedValue.success) {
      return undefined;
    }
    const line = CustomEffectLine.safeParse({ target: parsedTarget.data, value: parsedValue.data, type });
    return line.success ? line.data : undefined;
  });

  /** Whether the line being written can be added: it is valid and the effect has room for another. */
  protected readonly canAddLine = computed(
    () => this.#pendingLine() !== undefined && this.lines().length < CUSTOM_EFFECT_LINES_MAX,
  );

  protected readonly addLine = (): void => {
    const line = this.#pendingLine();
    if (line === undefined) {
      return;
    }
    this.lines.update((lines) => [...lines, line]);
    this.model.update((model) => ({ ...model, target: '', value: 0, type: ModifierType.Untyped }));
  };

  protected readonly removeLine = (index: number): void => {
    this.lines.update((lines) => lines.filter((_line, at) => at !== index));
  };

  protected readonly save = async ({ name, reason }: EffectModel): Promise<void> => {
    const effect = CustomEffectInput.parse({ name, reason, lines: this.lines() });
    await this.#store.patch({ field: CharacterPatchField.AddCustomEffect, effect });
    this.lines.set([]);
    this.form().reset(EMPTY);
  };

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  #statisticName(target: Selector): string {
    return this.statistics().find(({ value }) => value === target)?.label ?? target;
  }

  #effect({ value, type }: CustomEffectLine): string {
    const label: string = this.#i18n.translate(MODIFIER_TYPE_MESSAGES[type ?? ModifierType.Untyped]);
    return this.#i18n.translate(Message.EffectAdjust, {
      value: this.#format.number(value, { signDisplay: 'exceptZero' }),
      type: label,
    });
  }
}
