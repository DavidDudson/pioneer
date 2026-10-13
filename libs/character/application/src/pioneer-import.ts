import { CharacterId } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import { PioneerCharacterFile, PioneerReadProblem, readPioneerCharacter } from '@pioneer/interop/pioneer';
import { fieldIssues, message, newId, ValidationError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

const PROBLEM_MESSAGES = {
  [PioneerReadProblem.Malformed]: 'character.import.pioneer.problem.malformed',
  [PioneerReadProblem.NewerFormat]: 'character.import.pioneer.problem.newerFormat',
  [PioneerReadProblem.NewerCharacter]: 'character.import.pioneer.problem.newerCharacter',
  [PioneerReadProblem.InvalidCharacter]: 'character.import.pioneer.problem.invalidCharacter',
} as const satisfies Record<PioneerReadProblem, string>;

/** A file read as a new character of its importer, with the file it was read from. */
export interface ReadPioneerFile {
  readonly file: PioneerCharacterFile;
  readonly document: CharacterDocument;
}

/** The file read again on the server, as a new character of `ownerId`; refused, naming the problem, when it can't be. */
export function readPioneerFile(raw: unknown, ownerId: UserId): ReadPioneerFile {
  const read = readPioneerCharacter(raw, { id: CharacterId.parse(newId()), ownerId });
  if (!read.ok) {
    throw new ValidationError([
      { path: [], message: message(PROBLEM_MESSAGES[read.problem]) },
      ...fieldIssues(read.issues),
    ]);
  }
  return { file: PioneerCharacterFile.parse(raw), document: read.character };
}
