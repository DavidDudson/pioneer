import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Stack, Text, ToggleButton } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { ATTRIBUTE_MESSAGES } from '../../attributes/attributes-messages';
import { ChoiceState } from '../choice-line';
import type { ChoiceLine } from '../choice-line';
import { CHOICE_STATE_MESSAGES, ChoicesMessage, INVALID_AT_MESSAGE } from '../choices-messages';

/** A line as rendered: its badge and its pick worked out. */
interface ShownChoice {
  readonly label: MessageDescriptor;
  readonly badge: MessageDescriptor;
  readonly tone: BadgeTone;
  readonly selectionKey: string | undefined;
  readonly selectionName: string | undefined;
  readonly legacy: boolean;
  readonly reason: MessageDescriptor | undefined;
}

/** The badge's tone. The badge's text carries the meaning; the tone only repeats it. */
const STATE_TONES: Readonly<Record<ChoiceState, BadgeTone>> = {
  [ChoiceState.Open]: BadgeTone.Warning,
  [ChoiceState.Filled]: BadgeTone.Success,
  [ChoiceState.Planned]: BadgeTone.Info,
  [ChoiceState.Hidden]: BadgeTone.Neutral,
  [ChoiceState.Invalid]: BadgeTone.Danger,
};

function badgeOf({ state, level }: ChoiceLine): MessageDescriptor {
  if (level === undefined) {
    return message(CHOICE_STATE_MESSAGES[state]);
  }
  return message(state === ChoiceState.Invalid ? INVALID_AT_MESSAGE : CHOICE_STATE_MESSAGES[state], { level });
}

function shownOf(line: ChoiceLine): ShownChoice {
  const { selection } = line;
  return {
    label: line.label,
    badge: badgeOf(line),
    tone: STATE_TONES[line.state],
    selectionKey:
      selection !== undefined && 'attribute' in selection ? ATTRIBUTE_MESSAGES[selection.attribute] : undefined,
    selectionName: selection !== undefined && 'name' in selection ? selection.name : undefined,
    legacy: selection !== undefined && 'legacy' in selection,
    reason: line.reason,
  };
}

/**
 * One choice: its label, what is picked, a badge for its state, and an invalid one's reason beneath. A chosen one can
 * carry a toggle that keeps it while the rest are re-rolled.
 */
@Component({
  selector: 'pio-choice-row',
  imports: [Badge, Stack, Text, ToggleButton, TranslocoPipe],
  templateUrl: './choice-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoiceRow {
  public readonly line = input.required<ChoiceLine>();
  /** Whether a chosen choice offers the keep toggle. */
  public readonly lockable = input(false, { transform: booleanAttribute });
  /** Whether the choice is kept. */
  public readonly locked = input(false);
  /** Why the choice could not be kept, shown beneath it; undefined for none. */
  public readonly problem = input<MessageDescriptor | undefined>();
  /** The keep toggle was pressed: the choice is now kept, or not. */
  public readonly lockChange = output<boolean>();

  protected readonly Message = ChoicesMessage;
  protected readonly Tone = BadgeTone;
  protected readonly canLock = computed((): boolean => this.lockable() && this.line().state === ChoiceState.Filled);

  protected readonly shown = computed((): ShownChoice => shownOf(this.line()));
}
