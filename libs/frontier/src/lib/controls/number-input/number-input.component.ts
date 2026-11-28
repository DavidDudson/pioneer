import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { clamp as clampBetween } from '@pioneer/shared/utils';
import { Minus, Plus } from 'lucide';

import { Button } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { Control } from '../control';
import { adornmentVariants } from '../control.variants';
import { Input, InputAdornment } from '../input/input.component';

const WHOLE_STEP = 1;
const UP = 1;
const DOWN = -1;

/** Plain number control with native stepping. In a form use `fr-number-field`. */
@Component({
  selector: 'fr-number-input',
  imports: [Button, Icon, Input, TranslocoPipe],
  templateUrl: './number-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
})
export class NumberInput extends Control {
  /** Undefined only while the box is empty and `optional` is set; otherwise bind `(entered)`, which is a number. */
  public readonly value = model<number | undefined>(undefined);
  /** Every number the box takes, never the empty one: for a control that always holds a number. */
  public readonly entered = output<number>();
  /** Pins a typed number to `min` and `max`; off, an out-of-range number is kept so the caller can report it. */
  public readonly clamp = input(false, { transform: booleanAttribute });
  /** The empty box is no value: `value` goes undefined. Otherwise it keeps the last number. */
  public readonly optional = input(false, { transform: booleanAttribute });
  /**
   * Whether the box reads as a number (or is empty with `optional`). While it holds mid-edit text such as `-` or
   * `2.5` in a whole-number box, `value` keeps the last number: bind this to tell a stale value from the one shown.
   */
  public readonly complete = model(true);
  public readonly min = input<number | undefined>(undefined);
  public readonly max = input<number | undefined>(undefined);
  /** What the empty box says it means ("Any"). */
  public readonly placeholder = input<string | undefined>(undefined);
  /** The smallest change: 1 takes whole numbers only; 0.1 takes tenths too (a tenth of a Bulk is light). */
  public readonly step = input(WHOLE_STEP);
  /** Minus and plus buttons at the ends of the box, for touch. */
  public readonly steppers = input(false, { transform: booleanAttribute });

  protected readonly UP = UP;
  protected readonly DOWN = DOWN;
  protected readonly MinusIcon = Minus;
  protected readonly PlusIcon = Plus;
  protected readonly startSlotClasses = adornmentVariants({ edge: 'startAction' });
  protected readonly endSlotClasses = adornmentVariants({ edge: 'end' });
  protected readonly adornment = computed(() => (this.steppers() ? InputAdornment.Both : InputAdornment.None));
  /** A whole-number box shows the numeric keypad; one with fractions needs the decimal point. */
  protected readonly inputMode = computed(() => (this.#whole() ? 'numeric' : 'decimal'));
  protected readonly canDecrease = computed(() => this.#canMove(DOWN));
  protected readonly canIncrease = computed(() => this.#canMove(UP));
  /** The raw text while typing, so a clamped value doesn't rewrite what the user is still typing. */
  protected readonly text = linkedSignal(() => this.value()?.toString() ?? '');

  protected onInput(raw: string): void {
    this.text.set(raw);

    if (raw === '') {
      this.complete.set(this.optional());

      if (this.optional()) {
        this.value.set(undefined);
      }

      return;
    }

    const parsed = Number(raw);
    const readsAsNumber = this.#whole() ? Number.isInteger(parsed) : Number.isFinite(parsed);
    this.complete.set(readsAsNumber);

    if (readsAsNumber) {
      this.#enter(this.clamp() ? this.#withinBounds(parsed) : parsed);
      this.text.set(raw);
    }
  }

  /** Enter: when the box reads as a number, show the value it holds (the clamped one), then commit. */
  protected commit(): void {
    if (this.complete()) {
      this.text.set(this.value()?.toString() ?? '');
    }

    this.committed.emit();
  }

  protected move(direction: number): void {
    const current = this.value();
    const moved = current === undefined ? (this.min() ?? 0) : this.#round(current + direction * this.step());
    this.complete.set(true);
    this.#enter(this.#withinBounds(moved));
    this.text.set(this.value()?.toString() ?? '');
  }

  #enter(taken: number): void {
    this.value.set(taken);
    this.entered.emit(taken);
  }

  #whole(): boolean {
    return Number.isInteger(this.step());
  }

  #canMove(direction: number): boolean {
    const current = this.value();
    const bound = direction < 0 ? this.min() : this.max();

    return current === undefined || bound === undefined || (direction < 0 ? current > bound : current < bound);
  }

  #withinBounds(candidate: number): number {
    return clampBetween(candidate, this.min() ?? Number.NEGATIVE_INFINITY, this.max() ?? Number.POSITIVE_INFINITY);
  }

  /** Drops the float noise a fractional step adds (0.1 + 0.2). */
  #round(candidate: number): number {
    const decimals = this.step().toString().split('.')[1]?.length ?? 0;

    return Number(candidate.toFixed(decimals));
  }
}
