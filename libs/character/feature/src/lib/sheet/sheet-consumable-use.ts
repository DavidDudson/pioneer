import { inject, Injectable, signal } from '@angular/core';
import { keptRoll, presentRoll, RANDOM_SOURCE, RollPresenter, rollView } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import { NO_FORTUNE, rollWithFortune } from '@pioneer/rules/dice';
import type { FortunedRoll } from '@pioneer/rules/dice';
import type { ContentRegistry } from '@pioneer/rules/sdk';

import { CharacterStore } from '../data/character-store';
import { injectContentRegistry } from '../data/content-registry-query';
import { PlayStore } from '../data/play-store';
import { ACTION_CONTENT_KINDS } from './sheet-actions';
import { consumableLines, useCommand } from './sheet-consumables';
import type { ConsumableLine } from './sheet-consumables';
import { statisticInputsOf } from './sheet-inputs';
import { SheetState } from './sheet-state';

/** What the last use rolled, for the card. */
export interface UsedRoll {
  readonly name: string;
  readonly view: RollView;
}

/**
 * The one path that uses a consumable (#1832): it rolls what the consumable heals or damages for, sends the use the
 * server checks, shows the roll on the card and in the roll history, and reads the character again for the stack that
 * changed. The Consumables section and the Actions tab both use it, so a healing potion rolls the same in either.
 * Provided by the sheet page, so both read the same card.
 */
@Injectable()
export class SheetConsumableUse {
  readonly #presenter = inject(RollPresenter);
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);
  readonly #sheet = inject(SheetState);
  readonly #random = inject(RANDOM_SOURCE);
  readonly #registry = injectContentRegistry(ACTION_CONTENT_KINDS);
  #count = 0;

  readonly #rolled = signal<UsedRoll | undefined>(undefined);

  /** The roll of the last consumable used; unset until one that rolls is used. */
  public readonly rolled = this.#rolled.asReadonly();

  /** Uses one: the dice it rolls, then the one edit the server checks. The stack changed, so read the character again. */
  public async use(line: ConsumableLine): Promise<void> {
    const fortuned =
      line.roll === undefined ? undefined : rollWithFortune(line.roll.expression, NO_FORTUNE, this.#random);
    const kept = fortuned?.rolls.find((entry) => entry.kept)?.result;
    const command = useCommand(line, kept);
    if (command === undefined) {
      return;
    }
    await this.#play.send(command);
    this.#show(line, fortuned);
    await this.#characters.reload();
  }

  /** Uses the consumable stack held in the inventory item `key`; nothing happens while the sheet loads or for a key with no stack. */
  public async useHeld(key: string): Promise<void> {
    const registry: ContentRegistry | undefined = this.#registry.data();
    const engine = this.#sheet.engine();
    const character = this.#sheet.character();
    if (registry === undefined || engine === undefined || character === undefined) {
      return;
    }
    const line = consumableLines(registry, character, {
      turn: this.#play.play.data()?.play.turn,
      inputs: statisticInputsOf(engine, character),
    }).find((each) => each.key === key);
    if (line !== undefined) {
      await this.use(line);
    }
  }

  /** Puts the roll a use made on the card and in the history; nothing changes for a consumable that rolls nothing. */
  #show(line: ConsumableLine, fortuned: FortunedRoll | undefined): void {
    if (line.roll === undefined || fortuned === undefined) {
      return;
    }
    this.#count += 1;
    const view = rollView(this.#count, {
      expression: line.roll.expression,
      roll: fortuned,
      degree: undefined,
      damage: undefined,
    });
    this.#rolled.set({ name: line.name, view });
    const counted = keptRoll(fortuned);
    if (counted !== undefined) {
      this.#presenter.present(presentRoll(this.#count, line.name, counted));
    }
  }
}
