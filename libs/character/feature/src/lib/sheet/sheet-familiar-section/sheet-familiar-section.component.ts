import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { Companion, CompanionId } from '@pioneer/character/domain';
import { Stack } from '@pioneer/frontier';
import { deriveFamiliarStatistics } from '@pioneer/rules/engine';
import type { FamiliarStatistics } from '@pioneer/rules/engine';
import type { HitPoints } from '@pioneer/rules/sdk';
import { FamiliarCard } from '@pioneer/rules/ui';
import type { FamiliarCardView } from '@pioneer/rules/ui';

import { CharacterCompanionStore } from '../../data/character-companion-store';
import { PlayStore } from '../../data/play-store';
import { familiarCardView, familiarInputs, liveFamiliar } from '../sheet-familiar';
import { SheetFamiliarControls } from '../sheet-familiar-controls/sheet-familiar-controls.component';
import { SheetState } from '../sheet-state';

/** A familiar with the statistics its master gives it. */
interface DerivedFamiliar {
  readonly companion: Companion;
  readonly statistics: FamiliarStatistics;
}

/**
 * The Familiar section of the Encounter tab: the character's familiar as a stat block, derived from its master and
 * never stored, with the controls that play it: its Hit Points, conditions and Command (ADR-0004, ADR-0079). It shows nothing while the character has no familiar.
 */
@Component({
  selector: 'pio-sheet-familiar-section',
  imports: [FamiliarCard, SheetFamiliarControls, Stack],
  templateUrl: './sheet-familiar-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFamiliarSection {
  readonly #state = inject(SheetState);
  readonly #companions = inject(CharacterCompanionStore);
  readonly #play = inject(PlayStore);
  readonly #transloco = inject(TranslocoService);

  /** The familiar and its statistics, derived from its master; undefined while there is no familiar or its master's are not derived. */
  readonly #derived = computed((): DerivedFamiliar | undefined => {
    const registry = this.#state.engine();
    const character = this.#state.character();
    const companion = liveFamiliar(this.#companions.companions.data()?.companions ?? []);
    const inputs = registry === undefined || character === undefined ? undefined : familiarInputs(registry, character);

    return companion === undefined || inputs === undefined
      ? undefined
      : { companion, statistics: deriveFamiliarStatistics(inputs) };
  });

  protected readonly view = computed((): FamiliarCardView | undefined => {
    const derived = this.#derived();

    return derived === undefined
      ? undefined
      : familiarCardView({
          ...derived,
          play: this.#play.play.data()?.play.companions ?? {},
          translate: (key, params) => this.#transloco.translate(key, params),
        });
  });

  protected readonly id = computed((): CompanionId | undefined => this.#derived()?.companion.id);

  protected readonly maxHitPoints = computed((): HitPoints | undefined => this.#derived()?.statistics.hitPoints.total);
}
