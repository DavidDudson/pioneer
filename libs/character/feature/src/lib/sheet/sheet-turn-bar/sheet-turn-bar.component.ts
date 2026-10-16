import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TurnCommandField } from '@pioneer/character/domain';
import type { TurnCommand } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Badge,
  BadgeTone,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import { RollCard } from '@pioneer/play/ui';

import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { SheetInitiative } from '../sheet-initiative/sheet-initiative.component';
import { phaseKey, pipKey, pipTone, turnBarView, turnLog } from './turn-bar-view';
import type { TurnBarView, TurnLogLine } from './turn-bar-view';

/**
 * The turn bar (#354): the phase, the action pips (spent, left, and the quickened one apart), the reaction pip, Start
 * turn, End turn and Leave encounter, and what the last boundary did: its lines, with a roll card for the damage of
 * each persistent damage condition. The server runs the bookkeeping and answers with what happened.
 */
@Component({
  selector: 'pio-sheet-turn-bar',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Badge,
    RollCard,
    SheetInitiative,
    Skeleton,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './sheet-turn-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTurnBar {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  #rolled = 0;

  protected readonly badgeTone = BadgeTone;
  protected readonly playQuery = this.#play.play;
  protected readonly phaseKey = phaseKey;
  protected readonly pipTone = pipTone;
  protected readonly pipKey = pipKey;

  protected readonly bar = computed((): TurnBarView | undefined => {
    const read = this.#play.play.data();
    return read === undefined ? undefined : turnBarView(read.play.turn);
  });

  /** What the last Start turn or End turn did, in order. */
  protected readonly log = signal<readonly TurnLogLine[]>([]);

  /** Whether the initiative roll is on offer: Enter encounter opens it, rolling or skipping closes it. */
  protected readonly choosingInitiative = signal(false);

  protected readonly enterEncounter = async (): Promise<void> => {
    await this.#send({ field: TurnCommandField.EnterEncounter });
    this.choosingInitiative.set(true);
  };
  protected readonly startTurn = async (): Promise<void> => this.#send({ field: TurnCommandField.StartTurn });
  protected readonly endTurn = async (): Promise<void> => this.#send({ field: TurnCommandField.EndTurn });
  protected readonly leaveEncounter = async (): Promise<void> => {
    await this.#send({ field: TurnCommandField.LeaveEncounter });
    this.choosingInitiative.set(false);
  };

  /** The words of a log line, with the parameters its message carries. */
  protected readonly worded = (line: TurnLogLine): string =>
    this.#i18n.translate(line.message.key, line.message.params);

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  async #send(command: TurnCommand): Promise<void> {
    const events = await this.#play.sendTurn(command);
    const lines = turnLog(events, this.#rolled);
    this.#rolled += lines.length;
    this.log.set(lines);
  }
}
