import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Text } from '@pioneer/frontier';

/** The note that a rune (spellwatch) gives the character a new save against one hostile spell each turn; nothing without one. */
@Component({
  selector: 'pio-sheet-effect-spell-save-note',
  imports: [Text, TranslocoPipe],
  templateUrl: './sheet-effect-spell-save-note.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEffectSpellSaveNote {
  /** The name of what gives the new save; undefined when nothing does. */
  public readonly source = input.required<string | undefined>();
}
