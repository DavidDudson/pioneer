import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { currentHitPoints, HIT_POINTS_EDIT_MAX, PlayCommandField, untypedDamage } from '@pioneer/character/domain';
import type { PlayCommand } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Meter,
  NumberInput,
  Skeleton,
  Stack,
  Text,
  ToggleButton,
} from '@pioneer/frontier';
import { HitPoints } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';
import { grantedLines } from './granted-vitals';
import type { GrantedLine } from './granted-vitals';

/** Damage of `amount`, entered by hand, from a critical hit when `critical`. */
function damageOf(amount: HitPoints, critical: boolean): PlayCommand {
  return { field: PlayCommandField.Damage, damage: untypedDamage(amount, critical) };
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
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Meter,
    NumberInput,
    Skeleton,
    Stack,
    Text,
    ToggleButton,
    TranslocoPipe,
  ],
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
  /** Whether the damage entered is from a critical hit, which costs a character holding its breath a round of air. */
  protected readonly critical = signal(false);

  protected readonly hp = computed((): HitPointsView | undefined => {
    const max = this.#sheet.maxHitPoints();
    const read = this.#play.play.data();
    if (max === undefined || read === undefined) {
      return undefined;
    }
    return { current: currentHitPoints(read.play.hp, max), max, temp: read.play.hp.temp };
  });

  /** What the rule elements in play give besides the Hit Points above, as lines of text. */
  protected readonly granted = computed((): readonly string[] => {
    const vitals = this.#sheet.grantedVitals();
    return vitals === undefined ? [] : grantedLines(vitals).map((line) => this.#grantedText(line));
  });

  /** The reads behind Hit Points, each shown in its own region so a failure reads as one. */
  protected readonly playQuery = this.#play.play;
  protected readonly engineQuery = this.#sheet.engineQuery;

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  protected readonly ready = computed(() => this.hp() !== undefined && this.complete() && !this.busy());

  protected readonly damage = async (): Promise<void> => this.#send((amount) => damageOf(amount, this.critical()));
  protected readonly heal = async (): Promise<void> => this.#send(healOf);
  protected readonly setHp = async (): Promise<void> => this.#send(setHpOf);
  protected readonly setTempHp = async (): Promise<void> => this.#send(setTempHpOf);

  /** The server's reason (no maximum yet, a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  /** The form's name, or a generic one while its entry has none. */
  #formName(entry: ContentId): string {
    return this.#sheet.picks.entryNames().get(entry) ?? this.#translated('character.sheet.hp.unnamedForm');
  }

  #translated(key: string, params?: Readonly<Record<string, string | number | undefined>>): string {
    return this.#i18n.translate(key, params);
  }

  #grantedText({ key, amount, reach, size, form, stoppedBy }: GrantedLine): string {
    const text = this.#translated(key, {
      amount,
      reach,
      size: size === undefined ? undefined : this.#translated(size),
      form: form === undefined ? undefined : this.#formName(form.entry),
      own: form === undefined ? undefined : this.#translated(form.own),
    });
    if (stoppedBy.length === 0) {
      return text;
    }
    const types = stoppedBy.map((type) => this.#translated(type)).join(', ');
    return `${text} ${this.#translated('character.sheet.hp.stoppedBy', { types })}`;
  }
  async #send(command: (amount: HitPoints) => PlayCommand): Promise<void> {
    const amount = HitPoints.parse(this.amount());
    this.busy.set(true);
    try {
      await this.#play.send(command(amount));
    } finally {
      this.busy.set(false);
    }
  }
}
