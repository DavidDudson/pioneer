import {
  criticalSpecializationOf,
  DegreeOfSuccess,
  grievousSpecializationOf,
  RuleElementKey,
} from '@pioneer/rules/sdk';
import type { ContentText, CriticalSpecializationElement, NoteElement, Origin, RichText } from '@pioneer/rules/sdk';

import type { RuleInPlay } from './rule-in-play';
import { ETCHED_ATTACK, ETCHED_DAMAGE, ownsStrike, reaches } from './strike-targets';
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
  const owns = ownsStrike(rule, targets);
  // An etched selector names one roll: etched-attack the attack roll only, etched-damage the damage roll only.
  const attackSelectors = selectors.filter((selector) => selector !== ETCHED_DAMAGE);
  const damageSelectors = selectors.filter((selector) => selector !== ETCHED_ATTACK);
  return [
    ...(reaches(attackSelectors, targets.attack, owns) ? [{ ...note, roll: NoteRoll.Attack }] : []),
    ...(reaches(damageSelectors, targets.damage, owns) ? [{ ...note, roll: NoteRoll.Damage }] : []),
  ];
}

/** A rule in play whose element is a `CriticalSpecialization`. */
type SpecializingRule = RuleInPlay & { readonly element: CriticalSpecializationElement };

/**
 * `notes` with the critical specialization of the Strike's weapon group, unless it has a group without one or already
 * has it. A grievous element adds the group's further benefit instead, and an etched one only to the weapon it is
 * etched onto.
 */
function withCriticalSpecialization(
  notes: readonly StrikeNote[],
  rule: SpecializingRule,
  targets: StrikeTargets,
): readonly StrikeNote[] {
  const { group } = targets;
  const { element } = rule;
  if (group === undefined || (element.etched === true && !ownsStrike(rule, targets))) {
    return notes;
  }
  const text = element.grievous === true ? grievousSpecializationOf(group) : criticalSpecializationOf(group);
  if (text === undefined) {
    return notes;
  }
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
    ? withCriticalSpecialization(notes, { ...rule, element }, targets)
    : notes;
}
