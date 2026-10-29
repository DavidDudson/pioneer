import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AsyncButton, Stack } from '@pioneer/frontier';
import type { SlotKey } from '@pioneer/rules/sdk';
import { ChoicesView } from '@pioneer/rules/ui';
import type { ChoiceLockChange } from '@pioneer/rules/ui';

import { CharacterGenerator } from '../../data/character-generator';
import { describeSaveError } from '../sheet-field';
import { SheetPickFields } from '../sheet-pick-fields/sheet-pick-fields.component';
import { SheetState } from '../sheet-state';

/**
 * The character's choices, each chosen one with a toggle to keep it, and a Re-roll action that makes a new character
 * from the kept ones and a fresh seed, then opens it. The character on this sheet is left as it is. Which choices
 * are kept lasts as long as the sheet is open. It sits in the Plan tab, two routes below the characters list.
 */
@Component({
  selector: 'pio-sheet-reroll',
  imports: [AsyncButton, ChoicesView, SheetPickFields, Stack, TranslocoPipe],
  templateUrl: './sheet-reroll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetReroll {
  readonly #generator = inject(CharacterGenerator);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);
  readonly #sheet = inject(SheetState);

  protected readonly picks = this.#sheet.picks;
  protected readonly locked = signal<ReadonlySet<SlotKey>>(new Set());

  protected keep({ slot, locked }: ChoiceLockChange): void {
    this.locked.update((kept) => new Set(locked ? [...kept, slot] : [...kept].filter((key) => key !== slot)));
  }

  protected readonly reroll = async (): Promise<void> => {
    const character = this.#sheet.character();
    if (character === undefined) {
      return;
    }
    const { choices } = character.document.build;
    const locks = [...this.locked()].flatMap((slot) => {
      const selection = choices[slot];
      return selection === undefined ? [] : [{ slot, selection }];
    });
    const made = await this.#generator.generate({ level: character.level, name: character.document.name, locks });
    await this.#router.navigate(['../..', made.character.id], { relativeTo: this.#route });
  };

  /** The server's reason a kept pick could not be kept, else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
