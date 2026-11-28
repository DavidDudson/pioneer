import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AsyncButton, Stack, Text } from '@pioneer/frontier';

import { CharacterCompanionStore } from '../../data/character-companion-store';
import { PlayStore } from '../../data/play-store';
import { isWitch, patronReplaceable } from '../sheet-familiar';
import type { Familiar } from '../sheet-familiar';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';

/**
 * What a witch's patron does at daily preparations (Witch): when her familiar is dead it gives her another, which
 * knows the same spells. The dead one is archived as replaced. It shows nothing while there is nothing to replace.
 */
@Component({
  selector: 'pio-sheet-familiar-replace',
  imports: [AsyncButton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-familiar-replace.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFamiliarReplace {
  readonly #state = inject(SheetState);
  readonly #companions = inject(CharacterCompanionStore);
  readonly #play = inject(PlayStore);
  readonly #i18n = inject(TranslocoService);

  /** The dead familiar the patron replaces; undefined when the character is no witch or its familiar lives. */
  protected readonly dead = computed((): Familiar | undefined => {
    const registry = this.#state.engine();
    const character = this.#state.character();

    if (registry === undefined || character === undefined) {
      return undefined;
    }

    return patronReplaceable(
      this.#companions.companions.data()?.companions ?? [],
      this.#play.play.data()?.play.companions ?? {},
      isWitch(registry, character),
    );
  });

  protected readonly replace = async (): Promise<void> => {
    const familiar = this.dead();

    if (familiar !== undefined) {
      await this.#companions.replaceFamiliar(familiar);
    }
  };

  protected readonly describeError = (error: Error): string => {
    const { key, params } = describeSaveError(error);

    return this.#i18n.translate(key, params);
  };
}
