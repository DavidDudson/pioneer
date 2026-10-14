import type { Character } from '@pioneer/character/domain';
import type { ContentRegistry, ContentSource } from '@pioneer/rules/sdk';

import type { EffectivePacks } from './effective-packs';

/**
 * A content source that can also answer for one character. A plain `ContentSource` serves the official packs to
 * everyone, so a use case that is given one works as it did.
 */
export interface CharacterContentSource extends ContentSource {
  /** The content as `character` sees it: the official packs and the homebrew packs it uses. */
  readonly forCharacter?: (character: Character) => ContentSource;
}

/** The content `character` is worked out over. */
export function contentOfCharacter(content: CharacterContentSource, character: Character): ContentSource {
  return content.forCharacter?.(character) ?? content;
}

/** `content` for everyone, and for a character the homebrew packs `packs` says it uses as well. */
export class CharacterContent implements CharacterContentSource {
  readonly #content: ContentSource;
  readonly #packs: EffectivePacks;

  public constructor(content: ContentSource, packs: EffectivePacks) {
    this.#content = content;
    this.#packs = packs;
  }

  public async registry(): Promise<ContentRegistry> {
    return this.#content.registry();
  }

  public forCharacter(character: Character): ContentSource {
    return { registry: async () => this.#content.registry(await this.#packs.of(character)) };
  }
}
