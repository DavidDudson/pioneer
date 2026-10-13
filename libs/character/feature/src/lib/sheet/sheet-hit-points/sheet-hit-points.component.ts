import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { currentHitPoints, HIT_POINTS_EDIT_MAX, PlayCommandField, untypedDamage } from '@pioneer/character/domain';
import type { PlayCommand } from '@pioneer/character/domain';
import { AsyncButton, Meter, NumberInput, Stack, Text } from '@pioneer/frontier';
import { HitPoints } from '@pioneer/rules/sdk';

import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';

/** Damage of `amount`, entered by hand. */
function damageOf(amount: HitPoints): PlayCommand {
  return { field: PlayCommandField.Damage, damage: untypedDamage(amount) };
}

function healOf(amount: HitPoints): PlayCommand {
  return { field: PlayCommandField.Heal, amount };
}

function setHpOf(current: HitPoints): PlayCommand {
  return { field: PlayCommandField.SetHp, current };
}

function setTempHpOf(temp: HitPoints): PlayCommand {
  return { field: PlayCommandField.SetTempHp, temp };
}

/** Hit Points as the header shows them. */
interface HitPointsView {
  readonly current: HitPoints;
  readonly max: HitPoints;
  readonly temp: HitPoints;
}

/**
 * Hit Points and temporary Hit Points for the sheet header (#343), with damage, heal and set controls over one amount.
 * Current Hit Points are the maximum the engine derives less the damage taken; until the character has an ancestry and
 * a class there is no maximum, so it says so instead.
 */
@Component({
  selector: 'pio-sheet-hit-points',
  imports: [AsyncButton, Meter, NumberInput, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-hit-points.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHitPoints {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #sheet = inject(SheetState);

  protected readonly amountMax = HIT_POINTS_EDIT_MAX;
  /** The amount the controls apply, as typed. */
  protected readonly amount = signal(0);
  /** Whether the amount box holds a whole number, so a half-typed value is never sent. */
  protected readonly complete = signal(true);

  protected readonly hp = computed((): HitPointsView | undefined => {
    const max = this.#sheet.maxHitPoints();
    const read = this.#play.play.data();
    if (max === undefined || read === undefined) {
      return undefined;
    }
    return { current: currentHitPoints(read.play.hp, max), max, temp: read.play.hp.temp };
  });

  /** Whether the reads behind Hit Points are still loading, as opposed to there being no maximum to show. */
  protected readonly loading = computed(() => this.#play.play.isPending() || this.#sheet.engineQuery().isPending());

  protected readonly ready = computed(() => this.hp() !== undefined && this.complete());

  protected readonly damage = async (): Promise<void> => this.#send(damageOf);
  protected readonly heal = async (): Promise<void> => this.#send(healOf);
  protected readonly setHp = async (): Promise<void> => this.#send(setHpOf);
  protected readonly setTempHp = async (): Promise<void> => this.#send(setTempHpOf);

  /** The server's reason (no maximum yet, a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  async #send(command: (amount: HitPoints) => PlayCommand): Promise<void> {
    const amount = HitPoints.parse(this.amount());
    await this.#play.send(command(amount));
  }
}
