import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EnvironmentCommandField, environmentContent, restrictionsInPlay } from '@pioneer/character/domain';
import type { RestrictionInPlay } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text, ToggleButton } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ENVIRONMENT_CONTENT_KINDS, environmentOptions } from '../sheet-environments';
import type { EnvironmentOption } from '../sheet-environments';

/**
 * The environments the character can be in (#684): a toggle for each, and below them what the ones it is in forbid, each
 * with its reason. Environments are situations, not conditions; the player or the GM turns them on.
 */
@Component({
  selector: 'pio-sheet-environments',
  imports: [AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text, ToggleButton, TranslocoPipe],
  templateUrl: './sheet-environments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEnvironments {
  readonly #play = inject(PlayStore);

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

  /** What the environments the character is in forbid. */
  protected readonly restrictions = computed((): readonly RestrictionInPlay[] => {
    const registry = this.registry.data();
    const environments = this.#play.play.data()?.play.environments;
    return registry === undefined || environments === undefined
      ? []
      : restrictionsInPlay(environments, environmentContent(registry));
  });

  protected readonly set = async (environment: ContentId, active: boolean): Promise<void> => {
    await this.#play.send({ field: EnvironmentCommandField.SetEnvironment, environment, active });
  };
}
