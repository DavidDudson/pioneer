import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EnvironmentCommandField, TurnCommandField } from '@pioneer/character/domain';
import type { EnvironmentDuration } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Skeleton,
  Stack,
  Text,
  ToggleButton,
} from '@pioneer/frontier';
import { DurationCount, DurationUnit } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { SheetBreath } from '../sheet-breath/sheet-breath.component';
import {
  ENVIRONMENT_CONTENT_KINDS,
  environmentOptions,
  restrictionRows,
  sheetRestrictions,
} from '../sheet-environments';
import type { EnvironmentOption, RestrictionRow } from '../sheet-environments';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';

const TEN = DurationCount.parse(10);
const TEN_MINUTES: EnvironmentDuration = { count: TEN, unit: DurationUnit.Minute };
const ONE_HOUR: EnvironmentDuration = { count: DurationCount.parse(1), unit: DurationUnit.Hour };

/**
 * The environments the character can be in (#684): a toggle for each, and below them what the ones it is in forbid, each
 * with its reason. Environments are situations, not conditions; the player or the GM turns them on.
 */
@Component({
  selector: 'pio-sheet-environments',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    SheetBreath,
    Skeleton,
    Stack,
    Text,
    ToggleButton,
    TranslocoPipe,
  ],
  templateUrl: './sheet-environments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEnvironments {
  readonly #i18n = inject(TranslocoService);
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
    return restrictionRows(engine ?? registry, sheetRestrictions({ registry, engine, character }, environments));
  });

  /** What the last passing of time did, in order. */
  protected readonly log = signal<readonly string[]>([]);

  protected readonly set = async (environment: ContentId, active: boolean): Promise<void> => {
    await this.#play.send({ field: EnvironmentCommandField.SetEnvironment, environment, active });
  };

  protected readonly tenMinutes = async (): Promise<void> => this.#pass(TEN_MINUTES);
  protected readonly oneHour = async (): Promise<void> => this.#pass(ONE_HOUR);

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  async #pass(duration: EnvironmentDuration): Promise<void> {
    const events = await this.#play.sendTurn({ field: TurnCommandField.PassTime, duration });
    this.log.set(events.map(({ message }) => this.#i18n.translate(message.key, message.params)));
  }
}
