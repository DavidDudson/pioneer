import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AsyncData, AsyncPending, AsyncRegion } from '@pioneer/frontier';
import type { ActionMode } from '@pioneer/rules/sdk';
import { ActionsView, ActionsViewKind } from '@pioneer/rules/ui';
import type { ActionLine } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ACTION_CONTENT_KINDS, sheetActions } from '../sheet-actions';
import { SheetSpender } from '../sheet-spender';

/**
 * A sheet tab's Actions section (#353): the character's actions in the tab's mode, as Now (what it can do at this
 * moment, grouped by cost, the situation's first, and only what the turn has the actions for) and All (every action,
 * filterable, with why an unusable one is). An action with a roll rolls on the sheet's roll card in one click, with
 * the conditional toggles of the roll; one with a cost is used with the sheet's spender (#355).
 */
@Component({
  selector: 'pio-sheet-actions',
  imports: [ActionsView, AsyncData, AsyncPending, AsyncRegion],
  templateUrl: './sheet-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetActions {
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);
  readonly #spender = inject(SheetSpender);

  /** The tab's mode: the Now view lists the actions used in it. */
  public readonly mode = input.required<ActionMode>();

  /** The registry with the actions and what grants them. */
  protected readonly registry = injectContentRegistry(ACTION_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;
  protected readonly view = signal<ActionsViewKind>(ActionsViewKind.Now);

  /** The actions as the engine decides them for the character now; undefined while the content or play state loads. */
  protected readonly lines = computed((): readonly ActionLine[] | undefined => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const read = this.#play.play.data();
    return registry === undefined || character === undefined || read === undefined
      ? undefined
      : sheetActions(registry, character, { resources: read.play.resources, turn: this.#spender.turn() });
  });
}
