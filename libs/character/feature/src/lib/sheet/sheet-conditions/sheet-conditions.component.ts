import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PlayCommandField } from '@pioneer/character/domain';
import type { PlayCommand } from '@pioneer/character/domain';
import { AsyncButton, AsyncData, AsyncPending, AsyncRegion, Badge, Skeleton, Stack, Text } from '@pioneer/frontier';
import { ConditionValue } from '@pioneer/rules/sdk';
import { ENTRY_PREVIEWS, ContentPreview } from '@pioneer/rules/ui';
import type { EntryPreviews } from '@pioneer/rules/ui';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { CONDITION_CONTENT_KINDS, CONDITION_VALUE_MAX, conditionOptions, conditionViews } from '../sheet-conditions';
import type { ConditionOption, ConditionView } from '../sheet-conditions';
import { SheetEffects } from '../sheet-effects/sheet-effects.component';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';
import { SheetConditionAdd } from './sheet-condition-add.component';

const FIRST_VALUE = 1;

/**
 * The conditions on the character, for the sheet header (#348): each with its value and a stepper to raise or lower
 * it, a remove button, and the conditions it brings with it listed under it, which cannot be removed on their own. An
 * add picker puts a condition on the character, with a starting value for a valued one. What each does to the
 * statistics is the content's, worked out by the engine from the play state.
 */
@Component({
  selector: 'pio-sheet-conditions',
  imports: [
    SheetConditionAdd,
    SheetEffects,
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Badge,
    ContentPreview,
    Skeleton,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './sheet-conditions.component.html',
  providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(SheetState).conditionPreviews }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetConditions {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);

  protected readonly registry = injectContentRegistry(CONDITION_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;
  protected readonly valueMax = CONDITION_VALUE_MAX;
  protected readonly valueMin = FIRST_VALUE;

  protected readonly views = computed((): readonly ConditionView[] | undefined => {
    const registry = this.registry.data();
    const read = this.#play.play.data();
    return registry === undefined || read === undefined ? undefined : conditionViews(registry, read.play.conditions);
  });

  protected readonly options = computed((): readonly ConditionOption[] => {
    const registry = this.registry.data();
    return registry === undefined ? [] : conditionOptions(registry);
  });

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  /** One condition edit, for the add picker to send as it sends its own. */
  protected readonly send = async (command: PlayCommand): Promise<void> => this.#send(command);

  protected readonly raise = (view: ConditionView): (() => Promise<void>) =>
    this.#setValue(view, (view.value ?? FIRST_VALUE) + 1);
  protected readonly lower = (view: ConditionView): (() => Promise<void>) =>
    this.#setValue(view, (view.value ?? FIRST_VALUE) - 1);
  protected readonly remove =
    (view: ConditionView): (() => Promise<void>) =>
    async (): Promise<void> =>
      this.#send({ field: PlayCommandField.RemoveCondition, id: view.id });

  /** The server's reason (a conflict or a refusal), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  #setValue(view: ConditionView, value: number): () => Promise<void> {
    return async (): Promise<void> =>
      this.#send({ field: PlayCommandField.SetConditionValue, id: view.id, value: ConditionValue.parse(value) });
  }

  async #send(command: PlayCommand): Promise<void> {
    this.busy.set(true);
    try {
      await this.#play.send(command);
    } finally {
      this.busy.set(false);
    }
  }
}
