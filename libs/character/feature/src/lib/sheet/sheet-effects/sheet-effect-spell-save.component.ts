import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton } from '@pioneer/frontier';

import type { EffectView } from '../sheet-effects';

/**
 * What a rune that gives a new save against a hostile spell (spellwatch) adds to an effect in the effects list: for an
 * effect from the GM, a button that ends it once the player has rolled the save and succeeded.
 */
@Component({
  selector: 'pio-sheet-effect-spell-save',
  imports: [AsyncButton, TranslocoPipe],
  templateUrl: './sheet-effect-spell-save.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEffectSpellSave {
  /** Whether the character has a new save against a hostile spell to attempt; without one nothing shows. */
  public readonly offered = input.required<boolean>();
  /** The effect the button ends. */
  public readonly view = input.required<EffectView>();
  /** Whether an edit is in flight. */
  public readonly busy = input.required<boolean>();
  /** Ends the effect. */
  public readonly end = input.required<() => Promise<void>>();
  /** The reason an edit failed, as text. */
  public readonly describeError = input.required<(error: Error) => string>();
}
