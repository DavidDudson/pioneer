import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HIT_POINTS_EDIT_MAX, PlayCommandField, untypedDamage } from '@pioneer/character/domain';
import type { PlayCommand } from '@pioneer/character/domain';
import { AsyncButton, NumberInput, Stack, Text, ToggleButton } from '@pioneer/frontier';
import { HitPoints } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { PlayStore } from '../../data/play-store';
import { describeSaveError } from '../sheet-field';
import { SheetState } from '../sheet-state';
import { grantedLines } from './granted-vitals';
import type { GrantedLine } from './granted-vitals';
import { hitPointsView } from './hit-points-view';
import type { HitPointsView } from './hit-points-view';

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

/**
 * The Hit Point controls (#343): damage, heal and set over one amount, and what the rule elements in play give besides
 * Hit Points. They open from the Hit Points block, in a drawer. Until the character has an ancestry and a class there is
 * no maximum, so it says so instead.
 */
@Component({
  selector: 'pio-sheet-hit-point-controls',
  imports: [AsyncButton, NumberInput, Stack, Text, ToggleButton, TranslocoPipe],
  templateUrl: './sheet-hit-point-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetHitPointControls {
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

  protected readonly hp = computed((): HitPointsView | undefined =>
    hitPointsView(this.#sheet.maxHitPoints(), this.#play.play.data()?.play.hp),
  );

  /** What the rule elements in play give besides the Hit Points above, as lines of text. */
  protected readonly granted = computed((): readonly string[] => {
    const vitals = this.#sheet.grantedVitals();
    return vitals === undefined ? [] : grantedLines(vitals).map((line) => this.#grantedText(line));
  });

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
