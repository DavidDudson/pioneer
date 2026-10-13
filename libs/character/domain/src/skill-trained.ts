import type { ContentId, Selector, SlotKey } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { SkillOption } from './skill-content';

/** Whether a skill is trained by an entry of the effective set or by a skill slot's pick. */
export const SkillTrainingSourceKind = {
  Entry: 'entry',
  Slot: 'slot',
} as const;
export type SkillTrainingSourceKind = ValueOf<typeof SkillTrainingSourceKind>;

/** What trains a skill: an entry of the effective set (a class, a background), or an earlier skill slot's pick. */
export type SkillTrainingSource =
  | {
      readonly kind: typeof SkillTrainingSourceKind.Entry;
      readonly entry: ContentId;
    }
  | {
      readonly kind: typeof SkillTrainingSourceKind.Slot;
      readonly slot: SlotKey;
    };

/** A skill the character is trained in when a trained skill slot is read, and everything that trains it. */
export interface TrainedSkill {
  readonly skill: SkillOption;
  readonly sources: readonly SkillTrainingSource[];
}

/** What trains each skill so far: the grants' entries at a level, and the slots read before. */
interface TrainingSources {
  readonly entries: ReadonlyMap<Selector, readonly ContentId[]>;
  readonly slots: ReadonlyMap<Selector, readonly SlotKey[]>;
}

/** The skills among `skills` the character is trained in already, those `isTrained` accepts, each with its sources. */
export function trainedSkills(
  skills: readonly SkillOption[],
  isTrained: (skill: SkillOption) => boolean,
  { entries, slots }: TrainingSources,
): TrainedSkill[] {
  return skills.flatMap((skill): TrainedSkill[] => {
    const sources: SkillTrainingSource[] = [
      ...(entries.get(skill.selector) ?? []).map((entry): SkillTrainingSource => ({
        kind: SkillTrainingSourceKind.Entry,
        entry,
      })),
      ...(slots.get(skill.selector) ?? []).map((slot): SkillTrainingSource => ({
        kind: SkillTrainingSourceKind.Slot,
        slot,
      })),
    ];
    return isTrained(skill) && sources.length > 0 ? [{ skill, sources }] : [];
  });
}
