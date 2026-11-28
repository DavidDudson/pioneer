import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton } from '@pioneer/frontier';

import type { EffectView } from '../sheet-effects';

/** A button that ends an effect from the GM once the player has succeeded on a new save. */
@Component({
  selector: 'pio-sheet-effect-spell-save',
  imports: [AsyncButton, TranslocoPipe],
  templateUrl: './sheet-effect-spell-save.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEffectSpellSave {
  /** Whether the character has a new save against a hostile spell to attempt; without one nothing shows. */
  public readonly offered = input.required<boolean>();
  public readonly view = input.required<EffectView>();
  /** Whether an edit is in flight. */
  public readonly busy = input.required<boolean>();
  public readonly end = input.required<() => Promise<void>>();
  /** The reason an edit failed, as text. */
  public readonly describeError = input.required<(error: Error) => string>();
}
