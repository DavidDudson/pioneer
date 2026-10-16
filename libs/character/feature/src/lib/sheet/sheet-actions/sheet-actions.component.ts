import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { abilityFrequencies, abilityUseKey, PlayCommandField, SpendId } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion } from '@pioneer/frontier';
import type { ActionMode } from '@pioneer/rules/sdk';
import { ActionsView, ActionsViewKind, ActionUser } from '@pioneer/rules/ui';
import type { ActionLine, ActionUse } from '@pioneer/rules/ui';
import { newId } from '@pioneer/shared/kernel';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ACTION_CONTENT_KINDS, sheetActions, spendCostOf } from '../sheet-actions';

/**
 * A sheet tab's Actions section (#353): the character's actions in the tab's mode, as Now (what it can do at this
 * moment, grouped by cost, the situation's first) and All (every action, filterable, with why an unusable one is).
 * An action with a roll rolls on the sheet's roll card in one click, with the conditional toggles of the roll.
 */
@Component({
  selector: 'pio-sheet-actions',
  imports: [ActionsView, AsyncData, AsyncPending, AsyncRegion],
  templateUrl: './sheet-actions.component.html',
  providers: [{ provide: ActionUser, useFactory: (): ActionUser => inject(SheetActions) }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetActions extends ActionUser {
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);

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
      : sheetActions(registry, character, read.play.resources);
  });

  /** An action used: its cost taken from the turn with its frequency use, and logged. The server checks it all. */
  public override async use({ line, actions }: ActionUse): Promise<void> {
    const registry = this.registry.data();
    const cost = spendCostOf(line.cost, actions);
    if (registry === undefined || cost === undefined) {
      return;
    }
    const recorded = abilityFrequencies(registry).has(line.id) ? { use: abilityUseKey(line.id) } : {};
    await this.#play.send({
      field: PlayCommandField.SpendAction,
      id: SpendId.parse(newId()),
      action: line.id,
      cost,
      ...recorded,
    });
  }
}
