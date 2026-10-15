import { Level } from '@pioneer/rules/sdk';

import { PathbuilderName } from './import-kind';
import type { PathbuilderBuild } from './pathbuilder-export';

/** The feat types Pathbuilder doesn't take from a slot: a heritage has its own slot, an awarded feat is granted. */
const SLOTLESS_TYPES: ReadonlySet<string> = new Set(['Awarded Feat', 'Heritage']);

/** One feat row of the export: what it is, what it chose, and the slot Pathbuilder filled with it. */
export interface ImportedFeat {
  readonly name: PathbuilderName;
  /** The feat's own sub-choice ("Intimidation" for Skill Training), when it made one. */
  readonly choice: PathbuilderName | undefined;
  /** "Class Feat", "Skill Feat", "Archetype Feat"…, as Pathbuilder wrote it. */
  readonly type: PathbuilderName;
  readonly level: Level;
  /** Pathbuilder's label for the slot ("Druid Feat 4"), when it gave one. */
  readonly slot: PathbuilderName | undefined;
  /** Whether a slot holds it: false for a heritage and a feat the character is awarded. */
  readonly slotted: boolean;
}

function named(value: string | null | undefined): PathbuilderName | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? undefined : PathbuilderName.parse(trimmed);
}

/** The export's feats in order, rows with no name or a level outside 1 to 20 left out. */
export function importedFeats(build: PathbuilderBuild): ImportedFeat[] {
  return build.feats.flatMap(([rawName, choice, rawType, rawLevel, slot]): ImportedFeat[] => {
    const name = named(rawName);
    const type = named(rawType);
    const level = Level.safeParse(rawLevel);
    if (name === undefined || type === undefined || !level.success) {
      return [];
    }
    return [
      {
        name,
        choice: named(choice),
        type,
        level: level.data,
        slot: named(typeof slot === 'string' ? slot : undefined),
        slotted: !SLOTLESS_TYPES.has(type),
      },
    ];
  });
}
