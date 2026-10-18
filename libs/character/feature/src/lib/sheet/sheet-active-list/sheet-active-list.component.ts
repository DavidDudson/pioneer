import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ActiveSpellCommandField,
  ActiveSpellId,
  EffectCommandField,
  EffectInstanceId,
  EffectRounds,
  EffectSourceKind,
  SpellSpendKind,
  TurnPhase,
} from '@pioneer/character/domain';
import type { PlayCommand, TurnState } from '@pioneer/character/domain';
import { AsyncButton, AsyncData, AsyncPending, AsyncRegion, Badge, Skeleton, Stack, Text } from '@pioneer/frontier';
import { ActionCost } from '@pioneer/rules/sdk';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { affordability } from '../sheet-actions';
import { ACTIVE_CONTENT_KINDS, activeRows, ActiveKind } from '../sheet-active-list';
import type { ActiveRow } from '../sheet-active-list';
import { describeSaveError } from '../sheet-field';
import { SheetSpender } from '../sheet-spender';

/** How each source of an active spell or effect is worded, spelled out so the key check sees them. */
const SOURCE_KEYS: Readonly<Record<EffectSourceKind, string>> = {
  [EffectSourceKind.Self]: 'character.sheet.active.sourceSelf',
  [EffectSourceKind.Ally]: 'character.sheet.active.sourceAlly',
  [EffectSourceKind.Gm]: 'character.sheet.active.sourceGm',
};

/** The words for where a row came from. */
function sourceKeyOf(row: ActiveRow): string {
  return SOURCE_KEYS[row.source];
}

/** Whether the row's rounds can be taken down by one: they stay at 1 or more, an effect ending is a dismissal. */
function canShortenRow(row: ActiveRow): boolean {
  return (row.remaining ?? 0) > 1;
}

/** Whether dismissing the row takes the Dismiss action: a spell whose content has it, during a turn. */
function takesAction(row: ActiveRow, turn: TurnState | undefined): boolean {
  return row.kind === ActiveKind.Spell && row.dismissAction && turn?.phase === TurnPhase.Turn;
}

/**
 * Every active spell and effect in one list (#357): its name, where it came from, the rounds it has left or that it is
 * sustained, a Sustain button for a spell during a turn (one action, spent like any other) and a Dismiss button for
 * anything at any time. A spell whose content needs the Dismiss action spends one action when it is dismissed during
 * a turn; elsewhere removal is free. The rounds of an effect from another creature can be edited.
 */
@Component({
  selector: 'pio-sheet-active-list',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, Badge, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-active-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetActiveList {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #spender = inject(SheetSpender);

  protected readonly registry = injectContentRegistry(ACTIVE_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;
  protected readonly spell = ActiveKind.Spell;

  protected readonly sourceKey = sourceKeyOf;

  protected readonly rows = computed((): readonly ActiveRow[] => {
    const registry = this.registry.data();
    const read = this.#play.play.data();
    return registry === undefined || read === undefined ? [] : activeRows(registry, read.play);
  });

  /** Whether one more action can be spent now, which Sustain and the Dismiss action each take. */
  protected readonly actionLeft = computed(
    (): boolean => affordability(this.#spender.turn(), ActionCost.One, undefined).affordable !== false,
  );

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  /** Whether the row's spell can be sustained now: on the character's turn, once a turn, with rounds left and an action to spend. */
  protected readonly cannotSustain = (row: ActiveRow): boolean =>
    this.busy() ||
    row.sustainedThisTurn ||
    !row.canSustain ||
    this.#spender.turn()?.phase !== TurnPhase.Turn ||
    !this.actionLeft();

  /** Whether dismissing the row takes the Dismiss action and there is none to spend. */
  protected readonly cannotDismiss = (row: ActiveRow): boolean =>
    this.busy() || (takesAction(row, this.#spender.turn()) && !this.actionLeft());

  protected readonly sustain = (row: ActiveRow): (() => Promise<void>) =>
    this.#run(async () =>
      this.#spender.spendSpell(row.content, { kind: SpellSpendKind.Sustain, id: ActiveSpellId.parse(row.id) }),
    );

  protected readonly dismiss = (row: ActiveRow): (() => Promise<void>) => this.#run(async () => this.#dismiss(row));

  protected readonly longer = (row: ActiveRow): (() => Promise<void>) => this.#roundsBy(row, 1);
  protected readonly shorter = (row: ActiveRow): (() => Promise<void>) => this.#roundsBy(row, -1);

  /** Whether the row's rounds can be taken down by one: they stay at 1 or more, an effect ending is a dismissal. */
  protected readonly canShorten = canShortenRow;

  /** The server's reason (a conflict or a refusal), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  async #dismiss(row: ActiveRow): Promise<void> {
    if (row.kind === ActiveKind.Effect) {
      await this.#play.send({ field: EffectCommandField.RemoveEffect, id: EffectInstanceId.parse(row.id) });
    } else if (takesAction(row, this.#spender.turn())) {
      await this.#spender.spendSpell(row.content, { kind: SpellSpendKind.Dismiss, id: ActiveSpellId.parse(row.id) });
    } else {
      await this.#play.send({ field: ActiveSpellCommandField.DismissSpell, id: ActiveSpellId.parse(row.id) });
    }
  }

  #roundsBy(row: ActiveRow, change: number): () => Promise<void> {
    return this.#run(async () => {
      const command: PlayCommand = {
        field: EffectCommandField.SetEffectRemaining,
        id: EffectInstanceId.parse(row.id),
        remaining: EffectRounds.parse((row.remaining ?? 1) + change),
      };
      await this.#play.send(command);
    });
  }

  #run(edit: () => Promise<void>): () => Promise<void> {
    return async (): Promise<void> => {
      this.busy.set(true);
      try {
        await edit();
      } finally {
        this.busy.set(false);
      }
    };
  }
}
