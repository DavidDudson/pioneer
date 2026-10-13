import { repeatedTrainings } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentRegistry, SlotKey } from '@pioneer/rules/sdk';

import { sheetSlotContent } from './sheet-slot-content';

/** Words a message key with its parameters. */
export type Translate = (key: string, params: object) => string;

/** The skills among the character's trained ones that each of `values` would train again, by name, for those that do. */
export type TrainedAgain = (values: readonly string[]) => ReadonlyMap<string, readonly string[]>;

/**
 * What picking each option in `slot` would train again (#674), by skill name, read with the slot empty. Options already
 * read are kept, so typing in a picker reads each feat once.
 */
export function sheetTrainedAgain(registry: ContentRegistry, character: Character, slot: SlotKey): TrainedAgain {
  const content = sheetSlotContent(registry);
  const known = new Map<string, readonly string[]>();
  return (values) => {
    const unread = values.filter((value) => !known.has(value));
    const repeats = repeatedTrainings(character.document, content, {
      slot,
      values: unread.map((value) => ChoiceValue.parse(value)),
    });
    for (const value of unread) {
      known.set(
        value,
        (repeats.get(ChoiceValue.parse(value)) ?? []).map((skill) => skill.name),
      );
    }
    const repeated = values.map((value): [string, readonly string[]] => [value, known.get(value) ?? []]);
    return new Map(repeated.filter(([, skills]) => skills.length > 0));
  };
}

/** The line that marks an option training skills the character is trained in: "Already trained in Religion". */
export function trainedAgainNote(skills: readonly string[], translate: Translate): string {
  return translate('character.sheet.optionTrained', { skills: skills.join(', ') });
}

/** `options`, each that would train a skill again carrying the mark; every option stays selectable. */
export function markTrainedAgain(
  trainedAgain: TrainedAgain,
  options: readonly SelectOption<string>[],
  translate: Translate,
): readonly SelectOption<string>[] {
  const marks = trainedAgain(options.map((option) => option.value));
  return options.map((option) => {
    const skills = marks.get(option.value);
    return skills === undefined ? option : { ...option, description: trainedAgainNote(skills, translate) };
  });
}
