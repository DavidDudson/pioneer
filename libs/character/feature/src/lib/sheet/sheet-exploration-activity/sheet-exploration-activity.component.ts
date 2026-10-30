import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ExplorationCommandField } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ContentId } from '@pioneer/rules/sdk';
import { OptionPicker } from '@pioneer/rules/ui';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { EXPLORATION_CONTENT_KINDS, explorationOptions } from '../sheet-exploration-activity';

/** The choice that clears the activity: a select shows an empty value as its placeholder, and an id is never this. */
const NONE = 'none';

/**
 * The exploration activity picker (#501): what the character is doing while exploring (Defend, Search, Avoid Notice,
 * Follow the Expert). The choice is play state; it suggests the skill of the initiative roll (#506).
 */
@Component({
  selector: 'pio-sheet-exploration-activity',
  imports: [OptionPicker, AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-exploration-activity.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetExplorationActivity {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);

  protected readonly registry = injectContentRegistry(EXPLORATION_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;

  protected readonly choices = computed((): readonly SelectOption<string>[] => {
    const registry = this.registry.data();
    const none: SelectOption<string> = {
      value: NONE,
      label: this.#i18n.translate('character.sheet.exploration.activity.none'),
    };
    return [
      none,
      ...(registry === undefined
        ? []
        : explorationOptions(registry).map(({ id, name }) => ({
            value: id,
            label: name,
          }))),
    ];
  });

  /** The activity picked now, or none. */
  protected readonly picked = computed((): string => this.#play.play.data()?.play.exploration ?? NONE);

  protected readonly pick = async (value: string | undefined): Promise<void> => {
    const field = ExplorationCommandField.SetExplorationActivity;
    await this.#play.send(
      value === undefined || value === NONE ? { field } : { field, activity: ContentId.parse(value) },
    );
  };
}
