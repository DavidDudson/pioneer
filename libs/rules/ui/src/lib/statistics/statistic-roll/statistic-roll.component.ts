import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  Button,
  ButtonVariant,
  HoverCard,
  HoverCardContent,
  LocaleFormat,
  RollLuck,
  RollTone,
  Size,
  Stack,
  Text,
} from '@pioneer/frontier';
import type { StatisticValue } from '@pioneer/rules/engine';
import { StatisticKind } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { BreakdownView } from '../../breakdown/breakdown.component';
import { SIGNED } from '../../breakdown/number-style';
import { NO_ORIGIN_NAMES } from '../../origin-chain/origin-names';
import type { OriginNames } from '../../origin-chain/origin-names';
import { STATISTIC_ROLLER } from '../statistic-roller';
import { RollEffectMessage, StatisticsMessage } from '../statistics-messages';
import { rollCues } from './roll-cues';
import type { RollCues } from './roll-cues';
import { degreeAdjustmentText, rollTwiceText } from './roll-effect-words';

/** What a flat roll shows: nothing beyond its total. */
const NO_CUES: RollCues = { tone: RollTone.Neutral, luck: RollLuck.None, shifted: false, conditional: false };

/** Follows the modifier when something conditional would change the roll. */
const CONDITIONAL_MARK = '*';

/**
 * A text button that rolls one check: the modifier it rolls ("+10") is the label, never an icon. It is neutral until
 * a cue says otherwise: green or red text for a net bonus or penalty, an asterisk when a conditional line or effect
 * would change it, a background for fortune or misfortune and a blue border for a shifted degree of success. Hovering
 * or focusing it opens the breakdown and words each cue. Shown only where the page provides a
 * `STATISTIC_ROLLER`; the button names the check it rolls for screen readers ("Roll Perception +10").
 *
 * ```html
 * <pio-statistic-roll [name]="'Perception'" [statistic]="result" />
 * ```
 */
@Component({
  selector: 'pio-statistic-roll',
  imports: [BreakdownView, Button, HoverCard, HoverCardContent, Stack, Text],
  templateUrl: './statistic-roll.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticRoll {
  public readonly name = input.required<string>();
  public readonly statistic = input.required<StatisticValue>();
  /** Only a check is rolled; a DC or a value shows no button. */
  public readonly kind = input.required<StatisticKind>();
  /** Roll one d20 plus the total, though it is no check: no cue shows, since only a check's effects reach a roll. */
  public readonly flat = input(false);
  /** Display names of the entries the breakdown's lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for what the breakdown's origin chains refer to beyond entries. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly roller = inject(STATISTIC_ROLLER, { optional: true });
  readonly #format = inject(LocaleFormat);
  readonly #i18n = inject(TranslocoService);
  protected readonly rollVariant = ButtonVariant.Roll;
  protected readonly small = Size.Sm;
  /** The modifier the roll adds, signed: "+10". */
  protected readonly label = computed(() => this.#format.number(this.statistic().total, SIGNED));
  protected readonly cues = computed(() => (this.flat() ? NO_CUES : rollCues(this.statistic())));
  /** A check rolls through the page's roller; a flat roll needs one that can roll flat. */
  protected readonly rollable = computed(
    (): boolean =>
      this.roller !== null &&
      (this.kind() === StatisticKind.Check || (this.flat() && this.roller.rollFlat !== undefined)),
  );
  /** The label with an asterisk after it when something conditional would change the roll. */
  protected readonly shown = computed(() =>
    this.cues().conditional ? `${this.label()}${CONDITIONAL_MARK}` : this.label(),
  );
  protected readonly ariaLabel = computed(() => {
    const name = this.#i18n.translate(StatisticsMessage.Roll, { name: this.name(), modifier: this.label() });
    return this.cues().conditional ? this.#i18n.translate(RollEffectMessage.Conditional, { label: name }) : name;
  });
  /** Each fortune, misfortune and degree adjustment that reaches the check, worded for the popover. */
  protected readonly effects = computed<readonly string[]>(() => {
    const words = { i18n: this.#i18n, format: this.#format, names: { entries: this.entryNames() } };
    const { rollTwice = [], degreeAdjustments = [] } = this.statistic().rollEffects ?? {};
    return [
      ...rollTwice.map((line) => rollTwiceText(line, words)),
      ...degreeAdjustments.map((line) => degreeAdjustmentText(line, words)),
    ];
  });

  protected roll(): void {
    if (this.flat()) {
      this.roller?.rollFlat?.(this.name(), this.statistic().total);
      return;
    }
    this.roller?.roll({ name: this.name(), statistic: this.statistic() });
  }
}
