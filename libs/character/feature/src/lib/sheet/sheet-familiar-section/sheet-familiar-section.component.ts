import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { deriveFamiliarStatistics } from '@pioneer/rules/engine';
import { FamiliarCard } from '@pioneer/rules/ui';
import type { FamiliarCardView } from '@pioneer/rules/ui';

import { CharacterCompanionStore } from '../../data/character-companion-store';
import { PlayStore } from '../../data/play-store';
import { familiarCardView, familiarInputs, liveFamiliar } from '../sheet-familiar';
import { SheetState } from '../sheet-state';

/**
 * The Familiar section of the Encounter tab: the character's familiar as a stat block, derived from its master and
 * never stored (ADR-0004, ADR-0079). It shows nothing while the character has no familiar.
 */
@Component({
  selector: 'pio-sheet-familiar-section',
  imports: [FamiliarCard],
  templateUrl: './sheet-familiar-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFamiliarSection {
  readonly #state = inject(SheetState);
  readonly #companions = inject(CharacterCompanionStore);
  readonly #play = inject(PlayStore);
  readonly #transloco = inject(TranslocoService);

  protected readonly view = computed((): FamiliarCardView | undefined => {
    const registry = this.#state.engine();
    const character = this.#state.character();
    const familiar = liveFamiliar(this.#companions.companions.data()?.companions ?? []);

    if (registry === undefined || character === undefined || familiar === undefined) {
      return undefined;
    }

    const inputs = familiarInputs(registry, character);

    return inputs === undefined
      ? undefined
      : familiarCardView({
          companion: familiar,
          statistics: deriveFamiliarStatistics(inputs),
          play: this.#play.play.data()?.play.companions ?? {},
          translate: (key, params) => this.#transloco.translate(key, params),
        });
  });
}
