import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  Button,
  Field,
  FieldError,
  FieldHint,
  Heading,
  Label,
  LocaleFormat,
  NumberInput,
  Page,
  Stack,
  Surface,
  Text,
  TextInput,
  ToggleButton,
} from '@pioneer/frontier';
import {
  applyDamage,
  checkOutcome,
  degreeOfSuccess,
  DiceExpressionText,
  NO_DEFENCES,
  parseDiceExpression,
  rollWithFortune,
} from '@pioneer/rules/dice';
import type {
  DamageApplication,
  DamageTarget,
  DegreeResult,
  FortunedRoll,
  FortuneSources,
  ParseOutcome,
} from '@pioneer/rules/dice';
import { Dc } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { DamageTargetEditor } from '../damage-target-editor/damage-target-editor.component';
import { RANDOM_SOURCE } from '../random-source';
import { RollCard } from '../roll-card/roll-card.component';
import { rollView } from '../roll-view';
import type { RollView } from '../roll-view';

/** Newest rolls shown; older ones fall off. */
const HISTORY_LIMIT = 10;
const STARTING_EXPRESSION = '1d20+7';
const STARTING_DC = 20;
/** DCs the playground accepts: a generous range for trying rolls out. */
const DC_MIN = 0;
const DC_MAX = 99;

interface DcRangeParams {
  readonly minimum: string;
  readonly maximum: string;
}

/** What the playground's toggles stand in for; real effects will name the feat or spell granting them. */
const PLAYGROUND_FORTUNE = message('play.dice.playgroundFortune');
const PLAYGROUND_MISFORTUNE = message('play.dice.playgroundMisfortune');

/**
 * Type an expression, roll it with or without fortune and misfortune, and see every die behind the total;
 * optionally compare it with a DC, or apply it as damage to a target with immunities, weaknesses and
 * resistances.
 */
@Component({
  selector: 'pio-dice-playground-page',
  imports: [
    Button,
    DamageTargetEditor,
    Field,
    FieldError,
    FieldHint,
    Heading,
    Label,
    NumberInput,
    Page,
    RollCard,
    Stack,
    Surface,
    Text,
    TextInput,
    ToggleButton,
    TranslocoPipe,
  ],
  templateUrl: './dice-playground-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DicePlaygroundPage {
  readonly #random = inject(RANDOM_SOURCE);
  readonly #format = inject(LocaleFormat);
  #rolled = 0;

  protected readonly text = signal(STARTING_EXPRESSION);
  readonly #outcome = computed((): ParseOutcome => parseDiceExpression(DiceExpressionText.parse(this.text())));
  protected readonly error = computed((): MessageDescriptor | undefined => {
    const outcome = this.#outcome();
    return outcome.ok ? undefined : outcome.error;
  });
  protected readonly fortune = signal(false);
  protected readonly misfortune = signal(false);
  readonly #sources = computed((): FortuneSources => ({
    fortune: this.fortune() ? [PLAYGROUND_FORTUNE] : [],
    misfortune: this.misfortune() ? [PLAYGROUND_MISFORTUNE] : [],
  }));
  protected readonly againstDc = signal(false);
  protected readonly dcValue = signal(STARTING_DC);
  /** False while the DC box is empty or not a whole number; `dcValue` then still holds the last one. */
  protected readonly dcComplete = signal(true);
  protected readonly dcMin = DC_MIN;
  protected readonly dcMax = DC_MAX;
  /** The range in the error, in the viewer's locale. */
  protected readonly dcRange = computed((): DcRangeParams => ({
    minimum: this.#format.number(DC_MIN),
    maximum: this.#format.number(DC_MAX),
  }));
  /** The DC to compare with: unset when off, or when the typed value is not a DC. */
  readonly #dc = computed((): Dc | undefined => {
    const parsed = Dc.safeParse(this.dcValue());
    const usable = this.againstDc() && this.dcComplete() && parsed.success && parsed.data <= DC_MAX;
    return usable ? parsed.data : undefined;
  });
  protected readonly dcInvalid = computed((): boolean => this.againstDc() && this.#dc() === undefined);
  protected readonly canRoll = computed((): boolean => this.error() === undefined && !this.dcInvalid());
  protected readonly againstTarget = signal(false);
  protected readonly critical = signal(false);
  protected readonly target = signal<DamageTarget>(NO_DEFENCES);
  protected readonly rolls = signal<readonly RollView[]>([]);

  protected roll(): void {
    const outcome = this.#outcome();
    if (!outcome.ok || !this.canRoll()) {
      return;
    }
    this.#rolled += 1;
    const roll = rollWithFortune(outcome.expression, this.#sources(), this.#random);
    const view = rollView(this.#rolled, {
      expression: outcome.expression,
      roll,
      degree: this.#degree(roll),
      damage: this.#damage(roll),
    });
    this.rolls.update((rolls) => [view, ...rolls].slice(0, HISTORY_LIMIT));
  }

  /** The kept roll applied to the target, when one is set up. */
  #damage(roll: FortunedRoll): DamageApplication | undefined {
    const kept = roll.rolls.find((entry) => entry.kept);
    if (!this.againstTarget() || kept === undefined) {
      return undefined;
    }
    return applyDamage(kept.result, this.target(), { critical: this.critical() });
  }

  /** The kept roll's degree of success, when rolling against a DC. */
  #degree(roll: FortunedRoll): DegreeResult | undefined {
    const dc = this.#dc();
    const kept = roll.rolls.find((entry) => entry.kept);
    if (dc === undefined || kept === undefined) {
      return undefined;
    }
    return degreeOfSuccess(checkOutcome(kept.result), dc);
  }
}
