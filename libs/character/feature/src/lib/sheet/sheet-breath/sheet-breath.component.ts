import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { maxAir } from '@pioneer/character/domain';
import type { AirRounds, BreathState } from '@pioneer/character/domain';
import { Button, Stack, Text } from '@pioneer/frontier';

import { PlayStore } from '../../data/play-store';
import { breathCommand, breathView, heldBreath, noAirLeft, oneRoundLess } from '../sheet-breath';
import type { BreathView } from '../sheet-breath';
import { sheetSources } from '../sheet-sources';
import { SheetState } from '../sheet-state';

/** The breath held before the last edit, which Undo puts back (it may be none: holding the breath is undone by it). */
interface Undo {
  readonly breath: BreathState | undefined;
}

/**
 * Holding the breath underwater (#683): the air left, which a turn end spends, with buttons to hold the breath for
 * 5 plus the Constitution modifier rounds, lose a round, lose it all (speaking), or breathe again; each can be undone.
 */
@Component({
  selector: 'pio-sheet-breath',
  imports: [Button, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-breath.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetBreath {
  readonly #play = inject(PlayStore);
  readonly #state = inject(SheetState);
  readonly #undo = signal<Undo | undefined>(undefined);

  protected readonly canUndo = computed((): boolean => this.#undo() !== undefined);

  /** The breath held now; undefined while the character breathes freely. */
  readonly #breath = computed((): BreathState | undefined => this.#play.play.data()?.play.breath);

  protected readonly view = computed((): BreathView | undefined => {
    const breath = this.#breath();
    return breath === undefined ? undefined : breathView(breath);
  });

  /** The rounds the character can hold its breath for; undefined while the content or the character loads. */
  protected readonly maxAir = computed((): AirRounds | undefined => {
    const engine = this.#state.engine();
    const character = this.#state.character();
    return engine === undefined || character === undefined
      ? undefined
      : maxAir(sheetSources(engine, character).inputs.attributes);
  });

  async #change(next: BreathState | undefined): Promise<void> {
    this.#undo.set({ breath: this.#breath() });
    await this.#play.send(breathCommand(next));
  }

  protected readonly hold = async (rounds: AirRounds): Promise<void> => {
    await this.#change(heldBreath(rounds));
  };

  protected readonly loseRound = async (): Promise<void> => {
    const breath = this.#breath();
    if (breath !== undefined) {
      await this.#change(oneRoundLess(breath));
    }
  };

  protected readonly loseAll = async (): Promise<void> => {
    const breath = this.#breath();
    if (breath !== undefined) {
      await this.#change(noAirLeft(breath));
    }
  };

  protected readonly breatheAgain = async (): Promise<void> => {
    await this.#change(undefined);
  };

  protected readonly undo = async (): Promise<void> => {
    const step = this.#undo();
    if (step !== undefined) {
      this.#undo.set(undefined);
      await this.#play.send(breathCommand(step.breath));
    }
  };
}
