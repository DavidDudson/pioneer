import { contentKey, ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentKey } from '@pioneer/rules/sdk';

import { isStaffEntry } from './staff-matcher';

/** How many staves the engine can list the spells of. */
export interface StaffCoverage {
  /** How many weapons and items have the staff trait. */
  readonly staves: number;
  /** Those with no typed `staff` spells, used only as text until one is set; sorted. */
  readonly withoutSpells: readonly ContentKey[];
}

/** Whether a staff entry carries typed spells. */
function hasSpells(entry: ContentEntry): boolean {
  return (entry.kind === ContentKind.Weapon || entry.kind === ContentKind.Equipment) && entry.data.staff !== undefined;
}

/** Staff coverage (play-and-campaigns.md, "Staves and charged items"). A report, never a check. */
export function staffCoverage(entries: readonly ContentEntry[]): StaffCoverage {
  const staves = entries.filter((entry) => isStaffEntry(entry));
  return {
    staves: staves.length,
    withoutSpells: staves
      .filter((entry) => !hasSpells(entry))
      .map((entry) => contentKey(entry.pack, entry.slug))
      .toSorted(),
  };
}
