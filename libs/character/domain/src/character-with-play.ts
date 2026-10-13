import { Character } from './character';
import type { PlayState } from './play-state';

/** `character` with its play state as read from where it is stored apart (`character_play`). */
export function withPlay(character: Character, play: PlayState): Character {
  const { document, version, createdAt, updatedAt } = character;
  return new Character({ document: { ...document, play }, version, createdAt, updatedAt });
}
