import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Stack, Text, ToggleButton } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { ATTRIBUTE_MESSAGES } from '../../attributes/attributes-messages';
import { ChoiceState } from '../choice-line';
import type { ChoiceLine, ChoiceReplacement } from '../choice-line';
import { CHOICE_STATE_MESSAGES, ChoicesMessage, INVALID_AT_MESSAGE } from '../choices-messages';
import { ReplacementOffer } from '../replacement-offer/replacement-offer.component';

/** A line as rendered: its badge and its pick worked out. */
interface ShownChoice {
  readonly label: MessageDescriptor;
  readonly badge: MessageDescriptor;
  readonly tone: BadgeTone;
  readonly selectionKey: string | undefined;
  readonly selectionName: string | undefined;
  /** Message keys of what the pick is flagged for: a pre-remaster book, a pack no longer in force. */
  readonly flags: readonly string[];
  /** The newer entries that replace the pick, for the mark that offers them. */
  readonly replacements: readonly ChoiceReplacement[];
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

/** The flags a pick carries, in the order they show. */
function flagsOf(selection: ChoiceLine['selection']): readonly string[] {
  if (selection === undefined || !('name' in selection)) {
    return [];
  }
  return [
    ...('legacy' in selection ? [ChoicesMessage.Legacy] : []),
    ...('unsupported' in selection ? [ChoicesMessage.Unsupported] : []),
  ];
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
    flags: flagsOf(selection),
    replacements: selection !== undefined && 'replacedBy' in selection ? (selection.replacedBy ?? []) : [],
    reason: line.reason,
  };
}

/**
 * One choice: its label, what is picked, a badge for its state, and an invalid one's reason beneath. A chosen one can
 * carry a toggle that keeps it while the rest are re-rolled.
 */
@Component({
  selector: 'pio-choice-row',
  imports: [Badge, ReplacementOffer, Stack, Text, ToggleButton, TranslocoPipe],
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
  /** A replacement was pressed: the pick should become this entry. */
  public readonly replace = output<ChoiceReplacement>();

  protected readonly Message = ChoicesMessage;
  protected readonly Tone = BadgeTone;
  protected readonly canLock = computed((): boolean => this.lockable() && this.line().state === ChoiceState.Filled);

  /** Whether the mark on a replaced pick is open, showing why and the replacements. */
  protected readonly explaining = signal(false);
  protected readonly shown = computed((): ShownChoice => shownOf(this.line()));
  /** Why the choice is not settled: what its line says, and what keeping it ran into. */
  protected readonly notes = computed((): MessageDescriptor[] =>
    [this.shown().reason, this.problem()].filter((note) => note !== undefined),
  );
}
