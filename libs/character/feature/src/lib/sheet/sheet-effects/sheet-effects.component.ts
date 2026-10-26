import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EffectCommandField, EffectSourceKind } from '@pioneer/character/domain';
import type { ActiveEffect, PlayCommand } from '@pioneer/character/domain';
import { AsyncButton, AsyncData, AsyncPending, AsyncRegion, Badge, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { HitPoints } from '@pioneer/rules/sdk';
import { ENTRY_PREVIEWS, EntryNameCell } from '@pioneer/rules/ui';
import type { EntryPreviews } from '@pioneer/rules/ui';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { effectOptions, effectViews, steppedView } from '../sheet-effects';
import type { EffectOption, EffectView } from '../sheet-effects';
import { sheetEntryPreviews } from '../sheet-entry-previews';
import { EQUIPMENT_CONTENT_KINDS } from '../sheet-equipment';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';
import { sheetFormTempHp } from '../sheet-statistics';
import { SheetEffectAdd } from './sheet-effect-add.component';

/**
 * The effects on the character (#349): each with who it came from, the rounds it has left and its badge, which a
 * counter steps through. A picker puts an effect on the character, from the character, an ally or the GM. What each
 * does to the statistics is the content's rules, worked out by the engine from the play state. Sustain and Dismiss
 * come with the active list (#357).
 */
@Component({
  selector: 'pio-sheet-effects',
  imports: [
    SheetEffectAdd,
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Badge,
    EntryNameCell,
    Skeleton,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './sheet-effects.component.html',
  providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(SheetEffects).previews }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEffects {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #sheet = inject(SheetState);

  protected readonly registry = injectContentRegistry(EQUIPMENT_CONTENT_KINDS);
  /** What an effect's name previews: its entry, from the registry the list was built from. */
  public readonly previews: EntryPreviews = sheetEntryPreviews(() => this.registry.data());
  protected readonly playQuery = this.#play.play;
  protected readonly allySource = EffectSourceKind.Ally;
  protected readonly gmSource = EffectSourceKind.Gm;

  protected readonly views = computed((): readonly EffectView[] | undefined => {
    const registry = this.registry.data();
    const read = this.#play.play.data();
    return registry === undefined || read === undefined ? undefined : effectViews(registry, read.play.effects);
  });

  protected readonly options = computed((): readonly EffectOption[] => {
    const registry = this.registry.data();
    return registry === undefined ? [] : effectOptions(registry);
  });

  /** The temporary Hit Points `effect` would give the character, for the add picker to send with it. */
  protected readonly tempHpFor = (effect: ActiveEffect): HitPoints | undefined => {
    const registry = this.registry.data();
    const character = this.#sheet.character();
    return registry === undefined || character === undefined ? undefined : sheetFormTempHp(registry, character, effect);
  };

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  /** One effect edit, for the add picker to send as it sends its own. */
  protected readonly send = async (command: PlayCommand): Promise<void> => this.#send(command);

  protected readonly raise = (view: EffectView): (() => Promise<void>) => this.#step(view, true);
  protected readonly lower = (view: EffectView): (() => Promise<void>) => this.#step(view, false);
  protected readonly remove =
    (view: EffectView): (() => Promise<void>) =>
    async (): Promise<void> =>
      this.#send({ field: EffectCommandField.RemoveEffect, id: view.id });

  /** The server's reason (a conflict or a refusal), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  #step(view: EffectView, up: boolean): () => Promise<void> {
    return async (): Promise<void> => {
      const value = steppedView(view, up);
      if (value !== undefined) {
        await this.#send({ field: EffectCommandField.SetEffectBadge, id: view.id, value });
      }
    };
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
