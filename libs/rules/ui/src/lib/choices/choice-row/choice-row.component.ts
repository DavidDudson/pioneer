import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Stack, Text } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { ATTRIBUTE_MESSAGES } from '../../attributes/attributes-messages';
import { ChoiceState } from '../choice-line';
import type { ChoiceLine } from '../choice-line';
import { CHOICE_STATE_MESSAGES, INVALID_AT_MESSAGE } from '../choices-messages';

/** A line as rendered: its badge and its pick worked out. */
interface ShownChoice {
  readonly label: MessageDescriptor;
  readonly badge: MessageDescriptor;
  readonly tone: BadgeTone;
  readonly selectionKey: string | undefined;
  readonly selectionName: string | undefined;
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
    reason: line.reason,
  };
}

/** One choice: its label, what is picked, a badge for its state, and an invalid one's reason beneath. */
@Component({
  selector: 'pio-choice-row',
  imports: [Badge, Stack, Text, TranslocoPipe],
  templateUrl: './choice-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoiceRow {
  public readonly line = input.required<ChoiceLine>();

  protected readonly shown = computed((): ShownChoice => shownOf(this.line()));
}
