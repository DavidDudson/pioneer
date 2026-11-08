import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Surface } from '@pioneer/frontier';
import { ArmorClass, DefenceIcons, DefencesMessage } from '@pioneer/rules/ui';
import type { CriticalHitRoll } from '@pioneer/rules/ui';

import { SheetRolls } from '../sheet-rolls';
import { SheetState } from '../sheet-state';

/**
 * The Armor Class block at the top of the sheet: the number large, its breakdown on hover, and under it an icon for
 * each of resistances, immunities and weaknesses the character has, each opening its lines on hover.
 */
@Component({
  selector: 'pio-sheet-armor-class',
  imports: [ArmorClass, AsyncData, AsyncPending, AsyncRegion, DefenceIcons, Skeleton, Stack, Surface],
  templateUrl: './sheet-armor-class.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetArmorClass {
  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
  readonly #rolls = inject(SheetRolls);
  readonly #i18n = inject(TranslocoService);

  /** Rolls the flat check of a fortification rune: the card compares the d20 with the check's DC. */
  protected rollCriticalHitCheck({ dc }: CriticalHitRoll): void {
    this.#rolls.typeDc(dc);
    this.#rolls.rollFlat(this.#i18n.translate(DefencesMessage.CriticalHitCheckName), 0);
  }
}
