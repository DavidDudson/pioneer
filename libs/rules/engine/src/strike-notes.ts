import { criticalSpecializationOf, DegreeOfSuccess, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentText, NoteElement, Origin, RichText } from '@pioneer/rules/sdk';

import type { RuleInPlay } from './rule-in-play';
import { ownsStrike, reaches } from './strike-targets';
import type { StrikeTargets } from './strike-targets';

/** Which of a Strike's rolls a note is for. */
export const NoteRoll = { Attack: 'attack', Damage: 'damage' } as const;
export type NoteRoll = (typeof NoteRoll)[keyof typeof NoteRoll];

/** A `Note` element that reaches a Strike's attack or damage roll. */
export interface StrikeNote {
  readonly roll: NoteRoll;
  readonly title: ContentText | undefined;
  readonly text: RichText;
  /** The degrees of success it shows on; undefined for all of them. */
  readonly outcome: readonly DegreeOfSuccess[] | undefined;
  readonly origin: Origin;
}

/** The notes of one `Note` element, for each of the Strike's rolls it reaches. */
function notesOf(rule: RuleInPlay, element: NoteElement, targets: StrikeTargets): StrikeNote[] {
  const { selectors, title, text, outcome } = element;
  const note = { title, text, outcome, origin: rule.origin };
  return [
    ...(reaches(selectors, targets.attack, false) ? [{ ...note, roll: NoteRoll.Attack }] : []),
    ...(reaches(selectors, targets.damage, ownsStrike(rule, targets)) ? [{ ...note, roll: NoteRoll.Damage }] : []),
  ];
}

/** `notes` with the critical specialization of the Strike's weapon group, unless it has a group without one or already has it. */
function withCriticalSpecialization(
  notes: readonly StrikeNote[],
  rule: RuleInPlay,
  { group }: StrikeTargets,
): readonly StrikeNote[] {
  if (group === undefined) {
    return notes;
  }
  const text = criticalSpecializationOf(group);
  return notes.some((note) => note.outcome !== undefined && JSON.stringify(note.text) === JSON.stringify(text))
    ? notes
    : [
        ...notes,
        {
          roll: NoteRoll.Damage,
          title: undefined,
          text,
          outcome: [DegreeOfSuccess.CriticalSuccess],
          origin: rule.origin,
        },
      ];
}

/** `notes` with what `rule` adds to them: the notes of a `Note` element, or a group's critical specialization. */
export function notedBy(notes: readonly StrikeNote[], rule: RuleInPlay, targets: StrikeTargets): readonly StrikeNote[] {
  const { element } = rule;
  if (element.key === RuleElementKey.Note) {
    return [...notes, ...notesOf(rule, element, targets)];
  }
  return element.key === RuleElementKey.CriticalSpecialization
    ? withCriticalSpecialization(notes, rule, targets)
    : notes;
}
