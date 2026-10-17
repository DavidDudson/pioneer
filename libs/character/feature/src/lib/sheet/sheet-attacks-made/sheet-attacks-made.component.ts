import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AttackCount, TurnCommandField } from '@pioneer/character/domain';
import { AsyncButton, Badge, BadgeTone } from '@pioneer/frontier';

import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';

/**
 * The attacks made this turn, which set the multiple attack penalty of the next one, with a button each to take one
 * back or count one the sheet could not see (`setAttacks`). Shows nothing outside a running turn, which counts none.
 */
@Component({
  selector: 'pio-sheet-attacks-made',
  imports: [AsyncButton, Badge, TranslocoPipe],
  templateUrl: './sheet-attacks-made.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetAttacksMade {
  /** The attacks made; undefined when no turn is running. */
  public readonly made = input.required<number | undefined>();

  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);

  protected readonly badgeTone = BadgeTone;

  protected readonly fewer = async (): Promise<void> => this.#set(Math.max((this.made() ?? 0) - 1, 0));
  protected readonly more = async (): Promise<void> => this.#set((this.made() ?? 0) + 1);

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  async #set(count: number): Promise<void> {
    await this.#play.sendTurn({ field: TurnCommandField.SetAttacks, count: AttackCount.parse(count) });
  }
}
