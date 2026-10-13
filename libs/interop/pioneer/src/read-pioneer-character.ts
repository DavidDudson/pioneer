import {
  CorruptCharacterDocumentError,
  decodeCharacterDocument,
  UnsupportedSchemaVersionError,
} from '@pioneer/character/domain';
import type { CharacterDocument, CharacterId } from '@pioneer/character/domain';
import type { UserId, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentReference, referencedId } from './content-reference';
import { CURRENT_FORMAT_VERSION, PioneerCharacterFile, PioneerCharacterHeader } from './pioneer-character-file';
import { rewriteReferences } from './rewrite-references';

/** Why a file could not be read. The UI maps each to a message key. */
export const PioneerReadProblem = {
  /** Not JSON, or JSON that isn't a Pioneer character file. */
  Malformed: 'malformed',
  /** Written by a newer Pioneer than this one: its format version is past the current one. */
  NewerFormat: 'newer-format',
  /** A Pioneer file, but its character is newer than this Pioneer can read. */
  NewerCharacter: 'newer-character',
  /** A Pioneer file whose character is not a valid one; `issues` say where. */
  InvalidCharacter: 'invalid-character',
} as const;
export type PioneerReadProblem = ValueOf<typeof PioneerReadProblem>;

export interface PioneerRead {
  readonly ok: true;
  readonly character: CharacterDocument;
}

export interface PioneerReadFailure {
  readonly ok: false;
  readonly problem: PioneerReadProblem;
  readonly issues: readonly z.core.$ZodIssue[];
}

export type PioneerReadResult = PioneerRead | PioneerReadFailure;

/** Who the imported character is: a file is imported as a new character of the importing user. */
export interface PioneerImportTarget {
  readonly id: CharacterId;
  readonly ownerId: UserId;
}

function failure(problem: PioneerReadProblem, issues: readonly z.core.$ZodIssue[] = []): PioneerReadFailure {
  return { ok: false, problem, issues };
}

/** A reference object becomes the id it hashes to; anything else is left, for the document schema to refuse. */
function idOf(value: unknown): unknown {
  const reference = ContentReference.safeParse(value);
  return reference.success ? referencedId(reference.data) : value;
}

/** The file's character with its references turned back into ids, read as a stored document of the target. */
function decode(file: PioneerCharacterFile, target: PioneerImportTarget): PioneerReadResult {
  const stored = rewriteReferences(file.character, idOf);
  try {
    return { ok: true, character: decodeCharacterDocument({ ...stored, ...target }) };
  } catch (error) {
    if (error instanceof UnsupportedSchemaVersionError) {
      return failure(PioneerReadProblem.NewerCharacter);
    }
    if (error instanceof CorruptCharacterDocumentError && error.cause instanceof z.ZodError) {
      return failure(PioneerReadProblem.InvalidCharacter, error.cause.issues);
    }
    throw error;
  }
}

/**
 * Reads a Pioneer character file into a character document of the importing user. Files of any earlier character
 * schema version are upgraded as stored documents are; a file whose format or character is newer than this code is
 * refused by version, never guessed at.
 */
export function readPioneerCharacter(input: unknown, target: PioneerImportTarget): PioneerReadResult {
  const header = PioneerCharacterHeader.safeParse(input);
  if (!header.success) {
    return failure(PioneerReadProblem.Malformed, header.error.issues);
  }
  if (header.data.formatVersion > CURRENT_FORMAT_VERSION) {
    return failure(PioneerReadProblem.NewerFormat);
  }
  const file = PioneerCharacterFile.safeParse(input);
  return file.success ? decode(file.data, target) : failure(PioneerReadProblem.Malformed, file.error.issues);
}
