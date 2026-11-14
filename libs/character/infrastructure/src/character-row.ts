import { Character, decodeCharacterDocument, PlayStateSchema } from '@pioneer/character/domain';
import type { CharacterPlay, PlayState } from '@pioneer/character/domain';
import { Temporal } from '@pioneer/shared/kernel';

import { listColumnsOf } from './character-list-filter';
import type { characterPlay, characters } from './character.table';

type Row = typeof characters.$inferSelect;
/** What a build save writes: never `archivedAt`, which only archive and restore touch. */
type SavedRow = Omit<Row, 'archivedAt'>;
type PlayRow = typeof characterPlay.$inferSelect;

/** A character row with its play state, as every read joins them. */
interface JoinedRow {
  readonly character: Row;
  readonly play: unknown;
}

/** Stored play state, read at the current shape: a field added since it was written takes its default. */
function decodePlay(stored: unknown): PlayState {
  // A missing row (a left join's null) reads as fresh play state.
  const play = PlayStateSchema.safeParse(stored ?? {});
  if (!play.success) {
    throw new Error('Stored play state is invalid', { cause: play.error });
  }
  return play.data;
}

/** A character with its play state read into `document.play`; a row with none yet reads as fresh. */
export function toCharacter({ character: row, play }: JoinedRow): Character {
  const document = decodeCharacterDocument(row.document);
  return new Character({
    document: { ...document, play: decodePlay(play) },
    version: row.version,
    createdAt: Temporal.Instant.from(row.createdAt),
    updatedAt: Temporal.Instant.from(row.updatedAt),
  });
}

/**
 * The row for `character`: its document at the current schema version without its play state, which is stored apart
 * (`character_play`), with the list columns copied from it.
 */
export function toRow(character: Character): SavedRow {
  const { play: _apart, ...document } = character.document;
  return {
    id: document.id,
    version: character.version,
    ownerId: document.ownerId,
    name: document.name,
    level: document.level,
    ...listColumnsOf(character),
    schemaVersion: document.schemaVersion,
    document,
    createdAt: character.createdAt.toString(),
    updatedAt: character.updatedAt.toString(),
  };
}

export function toPlay(row: Pick<PlayRow, 'playRevision' | 'state'>): CharacterPlay {
  return { revision: row.playRevision, play: decodePlay(row.state) };
}
