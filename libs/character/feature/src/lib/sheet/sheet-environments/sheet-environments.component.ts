import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  characterLiftedRestrictions,
  EnvironmentCommandField,
  environmentContent,
  restrictionsInPlay,
} from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text, ToggleButton } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { SheetBreath } from '../sheet-breath/sheet-breath.component';
import { ENVIRONMENT_CONTENT_KINDS, environmentOptions, restrictionRows } from '../sheet-environments';
import type { EnvironmentOption, RestrictionRow } from '../sheet-environments';
import { sheetSources } from '../sheet-sources';
import { SheetState } from '../sheet-state';

/**
 * The environments the character can be in (#684): a toggle for each, and below them what the ones it is in forbid, each
 * with its reason. Environments are situations, not conditions; the player or the GM turns them on.
 */
@Component({
  selector: 'pio-sheet-environments',
  imports: [AsyncData, AsyncPending, AsyncRegion, SheetBreath, Skeleton, Stack, Text, ToggleButton, TranslocoPipe],
  templateUrl: './sheet-environments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEnvironments {
  readonly #play = inject(PlayStore);
  readonly #state = inject(SheetState);

  protected readonly registry = injectContentRegistry(ENVIRONMENT_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;

  protected readonly options = computed((): readonly EnvironmentOption[] => {
    const registry = this.registry.data();
    return registry === undefined ? [] : environmentOptions(registry);
  });

  /** The environments the character is in now. */
  protected readonly active = computed(
    (): ReadonlySet<ContentId> => new Set(this.#play.play.data()?.play.environments),
  );

  /** What the environments the character is in forbid, with what lifts each, if anything. */
  protected readonly restrictions = computed((): readonly RestrictionRow[] => {
    const registry = this.registry.data();
    const engine = this.#state.engine();
    const character = this.#state.character();
    const environments = this.#play.play.data()?.play.environments;
    if (registry === undefined || environments === undefined) {
      return [];
    }
    const lifted =
      engine === undefined || character === undefined
        ? []
        : characterLiftedRestrictions(character.document, sheetSources(engine, character));
    return restrictionRows(engine ?? registry, restrictionsInPlay(environments, environmentContent(registry), lifted));
  });

  protected readonly set = async (environment: ContentId, active: boolean): Promise<void> => {
    await this.#play.send({ field: EnvironmentCommandField.SetEnvironment, environment, active });
  };
}
