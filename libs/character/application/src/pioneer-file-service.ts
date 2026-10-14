import { Character, CharacterCommand } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import {
  embeddedNamer,
  exportPioneerCharacter,
  planHomebrewImport,
  registryNamer,
  unmatchedContent,
} from '@pioneer/interop/pioneer';
import type {
  HomebrewPackPlan,
  PioneerCharacterFile,
  PioneerImportPreview,
  ReferenceNamer,
} from '@pioneer/interop/pioneer';
import type { ContentRegistry, ContentSource } from '@pioneer/rules/sdk';
import { FIRST_VERSION, message, NotFoundError, ValidationError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import type { EmbeddedHomebrew } from './embedded-homebrew';
import { readPioneerFile } from './pioneer-import';

/** What the Pioneer file use cases are built on. */
export interface PioneerFileDeps {
  readonly repository: CharacterRepository;
  readonly content: ContentSource;
  readonly clock: Clock;
  /** Where a file's embedded homebrew comes from and goes to (ADR-0059). */
  readonly homebrew: EmbeddedHomebrew;
}

/** Names what the loaded packs have and what the file carries, so only what neither has is unmatched. */
function namerFor(content: ContentRegistry, file: PioneerCharacterFile): ReferenceNamer {
  const loaded = registryNamer(content);
  const carried = embeddedNamer(file.homebrew ?? []);
  return (id) => loaded(id) ?? carried(id);
}

/**
 * Pioneer character file use cases (ADR-0056, ADR-0059): export, and import with a preview. Framework-free, like
 * `CharacterService`, and applies the same access policy here, never in routes.
 */
export class PioneerFileService {
  readonly #deps: PioneerFileDeps;

  public constructor(deps: PioneerFileDeps) {
    this.#deps = deps;
  }

  /**
   * One of the actor's characters as a Pioneer character file: its stored inputs, each content entry named by pack and
   * slug, with the homebrew entries it uses (any the actor may read) embedded. Refused when the character uses content
   * that is neither loaded nor readable homebrew, since the file would lose it.
   */
  public async export(actor: UserId, id: CharacterId): Promise<PioneerCharacterFile> {
    const character = await this.#deps.repository.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
    const loaded = registryNamer(await this.#deps.content.registry());
    const firstTry = exportPioneerCharacter(character.document, loaded);
    const exported = firstTry.ok
      ? firstTry
      : exportPioneerCharacter(character.document, loaded, await this.#deps.homebrew.holding(actor, firstTry.unnamed));
    if (!exported.ok) {
      throw new ValidationError([
        {
          path: ['content'],
          message: message('character.validation.exportUnnamedContent', { count: exported.unnamed.length }),
        },
      ]);
    }
    return exported.file;
  }

  /**
   * What importing a file would make, saved nowhere: the character's name and level, what happens to each embedded
   * homebrew entry, and the content the file names that neither a loaded pack nor the file has. Refused when the file
   * can't be read.
   */
  public async preview(actor: UserId, raw: unknown): Promise<PioneerImportPreview> {
    const { file, document } = readPioneerFile(raw, actor);
    const content = await this.#deps.content.registry();
    const plans = await this.#plans(actor, file);
    return {
      name: document.name,
      level: document.level,
      homebrew: plans.map(({ report }) => report),
      unmatched: unmatchedContent(file, namerFor(content, file)),
    };
  }

  /**
   * A new character of the actor from a file, its stored inputs as the file had them: content no loaded pack has
   * stays as the ids it hashes to, which a pack that has it brings back. Embedded homebrew is made for the actor or
   * reused when identical, and never written over. The file is read again here, never taken from the client's
   * preview. Refused, with nothing saved, when it can't be read.
   */
  public async import(actor: UserId, raw: unknown): Promise<Character> {
    const { file, document } = readPioneerFile(raw, actor);
    await this.#deps.homebrew.apply(actor, await this.#plans(actor, file));
    const now = this.#deps.clock.now();
    const character = new Character({ document, version: FIRST_VERSION, createdAt: now, updatedAt: now });
    return this.#deps.repository.insert(character, { actor, command: CharacterCommand.ImportPioneer });
  }

  /** What importing `file`'s embedded homebrew does, given the packs this server has. */
  async #plans(actor: UserId, file: PioneerCharacterFile): Promise<HomebrewPackPlan[]> {
    const embedded = file.homebrew ?? [];
    const existing = await this.#deps.homebrew.existing(
      actor,
      embedded.map(({ pack }) => pack.id),
    );
    return planHomebrewImport(embedded, existing);
  }
}
