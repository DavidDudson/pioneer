import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, Label, TextInput } from '@pioneer/frontier';
import { Dc } from '@pioneer/rules/sdk';

/** Digits only: a DC is a whole number, and `Number()` would take `1e1` or ` 12`. */
const WHOLE_NUMBER = /^\d+$/u;

/**
 * The DC box of a roll card: type a DC to compare the roll with, empty the box to drop it. Text that is no DC is flagged
 * and not emitted, so the roll keeps the last good one.
 */
@Component({
  selector: 'pio-roll-dc',
  imports: [Field, FieldError, Label, TextInput, TranslocoPipe],
  templateUrl: './roll-dc.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollDc {
  /** The DC the roll is compared with; unset when it is not rolled against one. */
  public readonly dc = input<Dc | undefined>(undefined);
  /** The DC typed in the box, or undefined once it is emptied. */
  public readonly dcChange = output<Dc | undefined>();

  /** What the box holds, as typed; follows `dc` when the caller sets it. */
  protected readonly text = linkedSignal(() => this.dc()?.toString() ?? '');
  protected readonly invalid = computed((): boolean => {
    const text = this.text();
    return text !== '' && !(WHOLE_NUMBER.test(text) && Dc.safeParse(Number(text)).success);
  });

  protected type(text: string): void {
    this.text.set(text);
    if (text === '') {
      this.dcChange.emit(undefined);
      return;
    }
    const parsed = WHOLE_NUMBER.test(text) ? Dc.safeParse(Number(text)) : undefined;
    if (parsed?.success === true) {
      this.dcChange.emit(parsed.data);
    }
  }
}
