import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, Field, FieldError, Label, LocaleFormat, NumberInput, Select, Stack, Text } from '@pioneer/frontier';
import { DamageAdjustment, DamageAmount } from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { DamageTargetOptions } from '../damage-target-options';
import { DAMAGE_ADJUSTMENT_TARGET_KEYS } from '../dice-labels';

/** Which list an editor holds; both are a damage type or group with a value. */
export const AdjustmentKind = { Weakness: 'weakness', Resistance: 'resistance' } as const;
export type AdjustmentKind = ValueOf<typeof AdjustmentKind>;

interface KindKeys {
  readonly heading: string;
  readonly add: string;
  readonly remove: string;
}

const KIND_KEYS: Readonly<Record<AdjustmentKind, KindKeys>> = {
  [AdjustmentKind.Weakness]: {
    heading: 'play.dice.weaknesses',
    add: 'play.dice.addWeakness',
    remove: 'play.dice.removeWeakness',
  },
  [AdjustmentKind.Resistance]: {
    heading: 'play.dice.resistances',
    add: 'play.dice.addResistance',
    remove: 'play.dice.removeResistance',
  },
};

/** Values the playground accepts: plenty for any stat block. */
const VALUE_MIN = 1;
const VALUE_MAX = 99;
const STARTING_VALUE = 5;

interface EntryDisplay {
  readonly adjustment: DamageAdjustment;
  readonly value: string;
}

interface ValueRangeParams {
  readonly minimum: string;
  readonly maximum: string;
}

/**
 * A target's weaknesses or resistances: each type or group with its value, a picker and value box to add
 * one (replacing any for the same type), and a button to remove each.
 */
@Component({
  selector: 'pio-adjustment-editor',
  imports: [Button, Field, FieldError, Label, NumberInput, Select, Stack, Text, TranslocoPipe],
  templateUrl: './adjustment-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjustmentEditor {
  readonly #format = inject(LocaleFormat);
  protected readonly options = inject(DamageTargetOptions);
  protected readonly labels = DAMAGE_ADJUSTMENT_TARGET_KEYS;
  public readonly kind = input.required<AdjustmentKind>();
  public readonly adjustments = model.required<readonly DamageAdjustment[]>();

  protected readonly keys = computed((): KindKeys => KIND_KEYS[this.kind()]);
  protected readonly choice = signal<DamageAdjustmentTarget | undefined>(undefined);
  protected readonly value = signal(STARTING_VALUE);
  protected readonly valueComplete = signal(true);
  protected readonly valueMin = VALUE_MIN;
  protected readonly valueMax = VALUE_MAX;
  protected readonly valueRange = computed((): ValueRangeParams => ({
    minimum: this.#format.number(VALUE_MIN),
    maximum: this.#format.number(VALUE_MAX),
  }));
  /** The typed value, unset while the box is empty, mid-edit or out of range. */
  readonly #amount = computed((): DamageAmount | undefined => {
    const parsed = DamageAmount.safeParse(this.value());
    return this.valueComplete() && parsed.success && parsed.data <= VALUE_MAX ? parsed.data : undefined;
  });
  protected readonly valueInvalid = computed((): boolean => this.#amount() === undefined);
  protected readonly canAdd = computed((): boolean => this.choice() !== undefined && !this.valueInvalid());
  /** Each entry with its value in the viewer's locale. */
  protected readonly entries = computed((): readonly EntryDisplay[] =>
    this.adjustments().map((adjustment) => ({ adjustment, value: this.#format.number(adjustment.value) })),
  );

  protected add(): void {
    const type = this.choice();
    const value = this.#amount();
    if (type === undefined || value === undefined) {
      return;
    }
    const added = DamageAdjustment.parse({ type, value });
    this.adjustments.update((list) => [...list.filter((entry) => entry.type !== type), added]);
    this.choice.set(undefined);
  }

  protected remove(type: DamageAdjustmentTarget): void {
    this.adjustments.update((list) => list.filter((entry) => entry.type !== type));
  }
}
