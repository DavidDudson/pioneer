import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Doomed, Dying, PlayCommandField, Wounded } from '@pioneer/character/domain';
import type { PlayCommand, PlayState } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Badge,
  BadgeTone,
  BadgeVariant,
  NumberInput,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import { RANDOM_SOURCE, RollCard } from '@pioneer/play/ui';
import type { RollView } from '@pioneer/play/ui';
import type { Dc } from '@pioneer/rules/sdk';

import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { recoveryDc, rollRecoveryCheck } from './recovery-check';

const CONDITION_MAX = 4;

/** The death track as the header shows it. */
interface DeathTrackView {
  readonly dying: Dying;
  readonly wounded: Wounded;
  readonly doomed: Doomed;
  readonly dead: boolean;
  /** Whether a recovery check applies: the character is dying and still alive. */
  readonly recovering: boolean;
}

function viewOf({ dying, wounded, doomed, dead }: PlayState): DeathTrackView {
  return { dying, wounded, doomed, dead, recovering: dying > 0 && !dead };
}

/**
 * Dying, wounded and doomed for the sheet header, beside Hit Points (#344). A dying character rolls its recovery check
 * here: a flat check against DC 10 plus dying, shown on a roll card, whose degree is what the server applies. Dead is
 * shown, never removed. The three conditions can also be set by hand, for effects that give doomed or a correction.
 */
@Component({
  selector: 'pio-sheet-death-track',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Badge,
    NumberInput,
    RollCard,
    Skeleton,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './sheet-death-track.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetDeathTrack {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #random = inject(RANDOM_SOURCE);
  #rolled = 0;

  protected readonly conditionMax = CONDITION_MAX;
  protected readonly badgeTone = BadgeTone;
  protected readonly badgeVariant = BadgeVariant;
  protected readonly playQuery = this.#play.play;

  protected readonly track = computed((): DeathTrackView | undefined => {
    const read = this.#play.play.data();
    return read === undefined ? undefined : viewOf(read.play);
  });

  /** The DC of the next recovery check, as the roll card will compare it. */
  protected readonly dc = computed((): Dc | undefined => {
    const track = this.track();
    return track === undefined ? undefined : recoveryDc(track.dying);
  });

  /** The last recovery check rolled. */
  protected readonly lastRoll = signal<RollView | undefined>(undefined);

  /** The value the set buttons apply, as typed. */
  protected readonly value = signal(0);
  /** Whether the value box holds a whole number, so a half-typed value is never sent. */
  protected readonly complete = signal(true);
  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  protected readonly ready = computed(() => this.track() !== undefined && this.complete() && !this.busy());
  protected readonly canRoll = computed(() => this.track()?.recovering === true && !this.busy());

  protected readonly recover = async (): Promise<void> => {
    const track = this.track();
    if (track === undefined) {
      return;
    }
    this.#rolled += 1;
    const roll = rollRecoveryCheck(track.dying, this.#random, this.#rolled);
    this.lastRoll.set(roll.view);
    await this.#send({ field: PlayCommandField.RecoveryCheck, degree: roll.degree });
  };

  protected readonly setDying = async (): Promise<void> =>
    this.#send({ field: PlayCommandField.SetDying, dying: Dying.parse(this.value()) });
  protected readonly setWounded = async (): Promise<void> =>
    this.#send({ field: PlayCommandField.SetWounded, wounded: Wounded.parse(this.value()) });
  protected readonly setDoomed = async (): Promise<void> =>
    this.#send({ field: PlayCommandField.SetDoomed, doomed: Doomed.parse(this.value()) });

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
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
