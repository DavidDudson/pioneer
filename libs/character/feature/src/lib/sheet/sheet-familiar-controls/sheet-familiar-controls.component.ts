import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  companionPlay,
  CompanionStatus,
  ConditionCommandField,
  HIT_POINTS_EDIT_MAX,
  isConditionCommand,
  PlayCommandField,
  SpendCount,
  SpendId,
  SpendKind,
  TurnPhase,
} from '@pioneer/character/domain';
import type { CompanionId, ConditionInstanceId, PlayCommand } from '@pioneer/character/domain';
import { AsyncButton, NumberInput, Stack, Text } from '@pioneer/frontier';
import { HitPoints } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';
import { CONDITION_CONTENT_KINDS, conditionOptions, conditionViews } from '../sheet-conditions';
import type { ConditionOption, ConditionView } from '../sheet-conditions';
import { SheetConditionAdd } from '../sheet-conditions/sheet-condition-add.component';
import { commandActionId } from '../sheet-familiar';
import { describeSaveError } from '../sheet-field';

/** Command an Animal costs one action. */
const COMMAND_COST = { kind: SpendKind.Actions, count: SpendCount.parse(1) } as const;

/**
 * What a player does for the familiar in play: damage and heal it, give it conditions and take them off, and spend an
 * action to Command it. Its Hit Points and conditions are its own, never its master's (ADR-0079).
 */
@Component({
  selector: 'pio-sheet-familiar-controls',
  imports: [AsyncButton, NumberInput, SheetConditionAdd, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-familiar-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFamiliarControls {
  public readonly companion = input.required<CompanionId>();
  /** The most Hit Points the familiar has, derived from its master. */
  public readonly maxHitPoints = input.required<HitPoints>();

  readonly #play = inject(PlayStore);
  readonly #i18n = inject(TranslocoService);
  readonly #registry = injectContentRegistry([...ACTION_CONTENT_KINDS, ...CONDITION_CONTENT_KINDS]);

  protected readonly amountMax = HIT_POINTS_EDIT_MAX;
  protected readonly amount = signal(0);
  protected readonly complete = signal(true);
  protected readonly busy = signal(false);

  readonly #entry = computed(() => companionPlay(this.#play.play.data()?.play.companions ?? {}, this.companion()));

  protected readonly options = computed((): ReadonlyArray<ConditionOption> => {
    const registry = this.#registry.data();

    return registry === undefined ? [] : conditionOptions(registry);
  });

  protected readonly conditions = computed((): ReadonlyArray<ConditionView> => {
    const registry = this.#registry.data();

    return registry === undefined ? [] : conditionViews(registry, this.#entry().conditions);
  });

  /** Whether the familiar was commanded this turn, and so has its 2 actions. */
  protected readonly commanded = computed((): boolean => this.#entry().commanded);

  /** A Command is spent during a turn, on a familiar that is with its master and not yet commanded. */
  protected readonly canCommand = computed((): boolean => {
    const registry = this.#registry.data();
    const turn = this.#play.play.data()?.play.turn;

    return (
      registry !== undefined &&
      commandActionId(registry) !== undefined &&
      turn?.phase === TurnPhase.Turn &&
      this.#entry().status === CompanionStatus.Active &&
      !this.commanded() &&
      !this.busy()
    );
  });

  protected readonly ready = computed((): boolean => this.complete() && !this.busy());

  protected readonly damage = async (): Promise<void> => {
    const taken = Math.min(this.maxHitPoints(), this.#entry().damage + this.amount());
    await this.#send({
      field: PlayCommandField.SetCompanionDamage,
      companion: this.companion(),
      damage: HitPoints.parse(taken),
    });
  };

  protected readonly heal = async (): Promise<void> => {
    const taken = Math.max(0, this.#entry().damage - this.amount());
    await this.#send({
      field: PlayCommandField.SetCompanionDamage,
      companion: this.companion(),
      damage: HitPoints.parse(taken),
    });
  };

  protected readonly setTemp = async (): Promise<void> =>
    this.#send({
      field: PlayCommandField.SetCompanionTempHp,
      companion: this.companion(),
      temp: HitPoints.parse(this.amount()),
    });

  protected readonly command = async (): Promise<void> => {
    const registry = this.#registry.data();
    const action = registry === undefined ? undefined : commandActionId(registry);

    if (action === undefined) {
      return;
    }

    await this.#send({ field: PlayCommandField.SpendAction, id: SpendId.parse(newId()), action, cost: COMMAND_COST });
    await this.#send({
      field: PlayCommandField.SetCompanionCommanded,
      companion: this.companion(),
      commanded: true,
    });
  };

  /** Puts a condition on the familiar: the picker's edit of the master's conditions, made the familiar's. */
  protected readonly sendCondition = async (command: PlayCommand): Promise<void> => {
    if (isConditionCommand(command)) {
      await this.#send({ field: PlayCommandField.CompanionCondition, companion: this.companion(), change: command });
    }
  };

  protected readonly remove = (id: ConditionInstanceId) => async (): Promise<void> =>
    this.#send({
      field: PlayCommandField.CompanionCondition,
      companion: this.companion(),
      change: { field: ConditionCommandField.RemoveCondition, id },
    });

  protected readonly describeError = (error: Error): string => {
    const { key, params } = describeSaveError(error);

    return this.#i18n.translate(key, params);
  };

  async #send(command: PlayCommand): Promise<void> {
    this.busy.set(true);

    try {
      await this.#play.send(command);
    } finally {
      this.busy.set(false);
    }
  }
}
