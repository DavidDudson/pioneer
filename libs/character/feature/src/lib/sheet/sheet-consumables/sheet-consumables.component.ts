import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AsyncButton, AsyncData, AsyncPending, AsyncRegion, Skeleton, Stack, Text } from '@pioneer/frontier';
import { keptRoll, presentRoll, RANDOM_SOURCE, RollCard, RollPresenter, rollView } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import { NO_FORTUNE, rollWithFortune } from '@pioneer/rules/dice';
import type { FortunedRoll } from '@pioneer/rules/dice';
import type { ContentKind } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';
import { CONSUMABLE_COST_MESSAGES, consumableLines, useCommand } from '../sheet-consumables';
import type { ConsumableLine } from '../sheet-consumables';
import { describeSaveError } from '../sheet-field';
import { statisticInputsOf } from '../sheet-inputs';
import { SheetState } from '../sheet-state';

/** A consumable as shown: the words that say what it is and costs, beside the line the Use button acts on. */
interface ShownConsumable {
  readonly line: ConsumableLine;
  readonly summary: string;
  /** Why it cannot be used, when its formula reads something the character has no value for. */
  readonly problem: string | undefined;
}

/** What the last use rolled, for the card. */
interface UsedRoll {
  readonly name: string;
  readonly view: RollView;
}

const CONSUMABLE_KINDS: readonly ContentKind[] = ACTION_CONTENT_KINDS;

/**
 * The consumables the open character holds (#504): each with the cost of its activation, how many are left, and a Use
 * button. Using one spends the activation from the turn, takes one from the stack (the item goes at zero), applies the
 * effect it gives, and rolls what it heals or damages for on a roll card; a healing roll restores that many Hit Points.
 */
@Component({
  selector: 'pio-sheet-consumables',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, RollCard, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-consumables.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetConsumables {
  readonly #i18n = inject(TranslocoService);
  readonly #presenter = inject(RollPresenter);
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);
  readonly #sheet = inject(SheetState);
  readonly #random = inject(RANDOM_SOURCE);
  #count = 0;

  protected readonly registry = injectContentRegistry(CONSUMABLE_KINDS);
  protected readonly playQuery = this.#play.play;
  protected readonly busy = signal(false);
  /** The roll of the last consumable used; unset until one that rolls is used. */
  protected readonly rolled = signal<UsedRoll | undefined>(undefined);

  protected readonly consumables = computed((): readonly ShownConsumable[] => {
    const registry = this.registry.data();
    const engine = this.#sheet.engine();
    const character = this.#characters.selected();
    const read = this.#play.play.data();
    if (registry === undefined || engine === undefined || character === undefined || read === undefined) {
      return [];
    }
    const inputs = statisticInputsOf(engine, character);
    return consumableLines(registry, character, { turn: read.play.turn, inputs }).map((line): ShownConsumable => ({
      line,
      summary: this.#say('character.sheet.consumables.summary', {
        name: line.name,
        quantity: line.quantity,
        cost: this.#say(CONSUMABLE_COST_MESSAGES[line.cost]),
      }),
      problem:
        line.unresolved === undefined
          ? undefined
          : this.#say('character.sheet.consumables.unresolved', { reference: line.unresolved }),
    }));
  });

  /** Uses one: the dice it rolls, then the one edit the server checks. The stack changed, so read the character again. */
  protected readonly use = (line: ConsumableLine) => async (): Promise<void> => {
    this.busy.set(true);
    try {
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
    } finally {
      this.busy.set(false);
    }
  };

  /** Puts the roll a use made on the card; nothing changes for a consumable that rolls nothing. */
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
    this.rolled.set({ name: line.name, view });
    const counted = keptRoll(fortuned);
    if (counted !== undefined) {
      this.#presenter.present(presentRoll(this.#count, line.name, counted));
    }
  }

  #say(key: string, params?: Readonly<Record<string, string | number>>): string {
    return this.#i18n.translate(key, params);
  }

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
