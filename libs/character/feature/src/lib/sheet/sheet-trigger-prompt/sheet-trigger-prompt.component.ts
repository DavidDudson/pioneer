import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { abilityFrequencies } from '@pioneer/character/domain';
import type { ContentId } from '@pioneer/rules/sdk';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ACTION_CONTENT_KINDS, sheetActions } from '../sheet-actions';
import { SheetSpender } from '../sheet-spender';
import { SheetState } from '../sheet-state';
import { SheetTriggerPromptList } from './sheet-trigger-prompt-list.component';
import { triggerPromptRows } from './trigger-prompt-view';
import type { TriggerPromptRow } from './trigger-prompt-view';

/** The prompt for one event's abilities that need a player decision. */
@Component({
  selector: 'pio-sheet-trigger-prompt',
  imports: [SheetTriggerPromptList],
  templateUrl: './sheet-trigger-prompt.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTriggerPrompt {
  readonly #sheet = inject(SheetState);
  readonly #play = inject(PlayStore);
  readonly #spender = inject(SheetSpender);
  readonly #registry = injectContentRegistry(ACTION_CONTENT_KINDS);
  readonly #declined = signal<ReadonlySet<ContentId>>(new Set());
  /** Spends made before the prompt appeared are not answers to it, such as an ability used earlier in the turn. */
  readonly #answeredFrom = this.#play.play.data()?.play.spendLog.length ?? 0;

  /** The abilities the event fired, in order. */
  public readonly abilities = input.required<ReadonlyArray<ContentId>>();

  protected readonly rows = computed((): ReadonlyArray<TriggerPromptRow> => {
    const registry = this.#registry.data();
    const character = this.#sheet.character();
    const read = this.#play.play.data();

    if (registry === undefined || character === undefined || read === undefined) {
      return [];
    }

    const { resources, spendLog } = read.play;
    const lines = sheetActions(registry, character, { resources, turn: this.#spender.turn() });

    return triggerPromptRows({
      abilities: this.abilities(),
      lines,
      frequencies: abilityFrequencies(registry),
      resources,
      spendLog: spendLog.slice(this.#answeredFrom),
      declined: this.#declined(),
    });
  });

  protected decline(id: ContentId): void {
    this.#declined.update((declined) => new Set([...declined, id]));
  }
}
