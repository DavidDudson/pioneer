import { Level } from '@pioneer/rules/sdk';
import type { Selector, SlotKey } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { trainedEntries } from './skill-raises';
import { trainedSkills } from './skill-trained';
import type { TrainedSkill } from './skill-trained';
import { SkillSlotKind, skillSlots } from './skill-training';
import { skillReads } from './slot-reads';
import type { SlotContent } from './slot-reads';

/** The trained skill slots' picks up to the character's level, by the skill they name, in the order they are read. */
function slotTrainings(document: CharacterDocument, content: SlotContent): ReadonlyMap<Selector, readonly SlotKey[]> {
  const level = Level.parse(document.level);
  const picked = new Map<Selector, SlotKey[]>();
  for (const slot of skillSlots(document, skillReads(document, content))) {
    const named = slot.stored === undefined ? undefined : content.skills.skill(slot.stored);
    if (slot.kind === SkillSlotKind.Training && slot.level <= level && named !== undefined) {
      picked.set(named.selector, [...(picked.get(named.selector) ?? []), slot.key]);
    }
  }
  return picked;
}

/**
 * The skills two sources train at the character's level (#673): the entries of the effective set (a class, a
 * background, a feat) and the trained skill slots' picks. The first source trains it; every later one is lost, since a
 * skill is trained once. Each skill comes with all its sources, entries first, then slots in the order they are read.
 */
export function skillsTrainedTwice(document: CharacterDocument, content: SlotContent): readonly TrainedSkill[] {
  const entries = trainedEntries(skillReads(document, content).grantsAt(Level.parse(document.level)));
  return trainedSkills(content.skills.skills, () => true, { entries, slots: slotTrainings(document, content) }).filter(
    ({ sources }) => sources.length > 1,
  );
}
