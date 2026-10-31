import { Level } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentId, Selector, SlotKey } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { documentSkills } from './custom-lore';
import { withoutPick } from './feat-slots';
import type { SkillOption } from './skill-content';
import { trainingEntries } from './skill-raises';
import { SkillSlotKind, skillSlots } from './skill-training';
import { picksOf, resolveSlotsAt, skillReads, slotContextOf } from './slot-reads';
import type { SlotContent } from './slot-reads';

/** The selectors of the skills the character's own trained skill slots name, up to its level. */
function pickedTrainings(document: CharacterDocument, content: SlotContent): ReadonlySet<Selector> {
  const level = Level.parse(document.level);
  const slots = skillSlots(document, skillReads(document, content));
  return new Set(
    slots
      .filter((slot) => slot.kind === SkillSlotKind.Training && slot.level <= level)
      .flatMap((slot) => {
        const named =
          slot.stored === undefined ? undefined : documentSkills(document, content.skills).skill(slot.stored);
        return named === undefined ? [] : [named.selector];
      }),
  );
}

/** The slot a pick would go in, and the values asked about. */
export interface RepeatQuery {
  readonly slot: SlotKey;
  readonly values: readonly ChoiceValue[];
}

/** What is trained without the slot (the document with it empty): by the other entries, and by the skill slots' picks. */
interface Trained {
  readonly without: CharacterDocument;
  readonly entries: ReadonlyMap<Selector, readonly ContentId[]>;
  readonly picked: ReadonlySet<Selector>;
}

/** The skills `value` in `slot` trains again over `trained`: those it adds a trainer of that are trained already. */
function repeatsOf(
  content: SlotContent,
  { slot, value }: { readonly slot: SlotKey; readonly value: ChoiceValue },
  trained: Trained,
): readonly SkillOption[] {
  const picks = new Map([...picksOf(trained.without), [slot, value]]);
  const trainers = trainingEntries(
    resolveSlotsAt(Level.parse(trained.without.level), slotContextOf(trained.without, content, picks)),
  );
  const named = new Map(content.skills.skills.map((skill) => [skill.selector, skill]));
  return [...trainers].flatMap(([selector, entries]) => {
    const before = trained.entries.get(selector) ?? [];
    const adds = entries.some((entry) => !before.includes(entry));
    const skill = named.get(selector);
    return adds && (before.length > 0 || trained.picked.has(selector)) && skill !== undefined ? [skill] : [];
  });
}

/**
 * The skills among the character's trained ones that each value of `query` in its slot would train again, by the
 * skill: its entries (and what they grant) train it while another entry or a trained skill slot's pick does too. Read
 * with the slot itself empty, as `selectSlot` reads it, so the pick a value replaces never counts against it. A
 * choice-driven skill stays out until the choice is made. Only the values that repeat a training are in the map.
 */
export function repeatedTrainings(
  document: CharacterDocument,
  content: SlotContent,
  { slot, values }: RepeatQuery,
): ReadonlyMap<ChoiceValue, readonly SkillOption[]> {
  const without = withoutPick(document, slot);
  const trained: Trained = {
    without,
    entries: trainingEntries(skillReads(without, content).grantsAt(Level.parse(document.level))),
    picked: pickedTrainings(document, content),
  };
  const repeats = values.map((value): [ChoiceValue, readonly SkillOption[]] => [
    value,
    repeatsOf(content, { slot, value }, trained),
  ]);
  return new Map(repeats.filter(([, skills]) => skills.length > 0));
}
