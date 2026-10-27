import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Stack, Text } from '@pioneer/frontier';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { activeEnvironmentNames, ENVIRONMENT_CONTENT_KINDS } from '../sheet-environments';

/**
 * The environments the character is in, in the sheet's header (#684): a badge for each, so the situation shows beside the
 * conditions. Nothing shows while the character is in none.
 */
@Component({
  selector: 'pio-sheet-active-environments',
  imports: [Badge, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-active-environments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetActiveEnvironments {
  readonly #play = inject(PlayStore);
  readonly #registry = injectContentRegistry(ENVIRONMENT_CONTENT_KINDS);

  protected readonly names = computed((): readonly string[] => {
    const registry = this.#registry.data();
    const environments = this.#play.play.data()?.play.environments;
    return registry === undefined || environments === undefined ? [] : activeEnvironmentNames(registry, environments);
  });
}
