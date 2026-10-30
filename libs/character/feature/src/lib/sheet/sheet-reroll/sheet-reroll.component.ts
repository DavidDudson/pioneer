import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AsyncButton, Stack } from '@pioneer/frontier';
import type { SlotKey } from '@pioneer/rules/sdk';
import { ChoicesView } from '@pioneer/rules/ui';
import type { ChoiceLockChange } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';

import { CharacterGenerator } from '../../data/character-generator';
import { describeSaveError } from '../sheet-field';
import { SheetPickFields } from '../sheet-pick-fields/sheet-pick-fields.component';
import { SheetState } from '../sheet-state';

/** Where the server puts an issue about one kept pick: `locks`, then the pick's index in the request. */
const LOCKS_PATH = 'locks';

/**
 * The character's choices, each chosen one with a toggle to keep it, and a Re-roll action that makes a new character
 * from the kept ones and a fresh seed, then opens it. The character on this sheet is left as it is. Which choices
 * are kept lasts as long as the sheet is open. A kept pick the server can't keep shows its reason beneath that pick.
 * It sits in the Plan tab, two routes below the characters list.
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
  /** Why a kept pick could not be kept, by slot, from the last re-roll the server refused. */
  protected readonly problems = signal<ReadonlyMap<SlotKey, MessageDescriptor>>(new Map());

  protected keep({ slot, locked }: ChoiceLockChange): void {
    this.locked.update((kept) => new Set(locked ? [...kept, slot] : [...kept].filter((key) => key !== slot)));
    this.problems.update((problems) => new Map([...problems].filter(([key]) => key !== slot)));
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
    this.problems.set(new Map());
    try {
      const made = await this.#generator.generate({ level: character.level, name: character.document.name, locks });
      await this.#router.navigate(['../..', made.character.id], { relativeTo: this.#route });
    } catch (error) {
      this.problems.set(lockProblems(error, locks));
      throw error;
    }
  };

  /** What the Re-roll button says when it failed: the picks to look at, else the server's reason or the sheet's own. */
  protected readonly describeError = (error: unknown): string => {
    if (this.problems().size > 0) {
      return this.#i18n.translate('character.sheet.reroll.problems');
    }
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}

/** The server's reason for each kept pick it refused, by slot; empty when the failure wasn't about kept picks. */
function lockProblems(
  error: unknown,
  locks: readonly { readonly slot: SlotKey }[],
): ReadonlyMap<SlotKey, MessageDescriptor> {
  const issues = error instanceof ApiError ? error.issues : [];
  return new Map(
    issues.flatMap(({ path, message }) => {
      const [head, index] = path;
      const lock = head === LOCKS_PATH && typeof index === 'number' ? locks[index] : undefined;
      return lock === undefined ? [] : [[lock.slot, message] as const];
    }),
  );
}
