import type { Character } from '@pioneer/character/domain';
import { BuildPart } from '@pioneer/rules/ui';
import type { BuildLine } from '@pioneer/rules/ui';

/** The parameters of the header's one-line identity ("Level 5 Dwarf Cleric, Warpriest"). */
export interface IdentityParams {
  readonly level: number;
  readonly hasAncestry: 'yes' | 'no';
  readonly ancestry: string;
  readonly hasClass: 'yes' | 'no';
  readonly class: string;
  readonly hasSubclass: 'yes' | 'no';
  readonly subclass: string;
}

function nameOf(lines: readonly BuildLine[], part: BuildPart): string | undefined {
  const value = lines.find((line) => line.part === part)?.value;
  return value !== undefined && 'name' in value ? value.name : undefined;
}

/**
 * The character's level, ancestry, class and subclass for the header line, each by the name the build summary shows;
 * a part not picked yet is left out.
 */
export function sheetIdentity(character: Character, lines: readonly BuildLine[]): IdentityParams {
  const ancestry = nameOf(lines, BuildPart.Ancestry);
  const characterClass = nameOf(lines, BuildPart.Class);
  const subclass = nameOf(lines, BuildPart.Subclass);
  return {
    level: character.level,
    hasAncestry: ancestry === undefined ? 'no' : 'yes',
    ancestry: ancestry ?? '',
    hasClass: characterClass === undefined ? 'no' : 'yes',
    class: characterClass ?? '',
    hasSubclass: subclass === undefined ? 'no' : 'yes',
    subclass: subclass ?? '',
  };
}
