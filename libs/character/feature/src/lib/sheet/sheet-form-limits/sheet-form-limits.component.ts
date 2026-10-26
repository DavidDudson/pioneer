import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { formLimits, itemContent } from '@pioneer/character/domain';
import type { FormLimits } from '@pioneer/character/domain';
import { Text } from '@pioneer/frontier';

import { sheetSlotContent } from '../sheet-slot-content';
import { SheetState } from '../sheet-state';

/**
 * What the form the character is in forbids of its spellcasting (#531), in words above the spell lists: the lists keep
 * their place, and this says why none can be cast. Empty out of a form and in one that lets the character cast.
 */
@Component({
  selector: 'pio-sheet-form-limits',
  imports: [Text, TranslocoPipe],
  templateUrl: './sheet-form-limits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFormLimits {
  readonly #sheet = inject(SheetState);

  /** What the form forbids, read from the character the sheet shows: nothing in the base view. */
  readonly #limits = computed((): FormLimits | undefined => {
    const registry = this.#sheet.engine();
    const character = this.#sheet.character();
    return registry === undefined || character === undefined
      ? undefined
      : formLimits(character.document, itemContent(registry), sheetSlotContent(registry));
  });

  /** The name of the form that forbids casting; undefined when nothing does. */
  protected readonly cantCastIn = computed((): string | undefined =>
    this.#limits()?.cantCast === true ? this.#sheet.activeForm()?.name : undefined,
  );
}
