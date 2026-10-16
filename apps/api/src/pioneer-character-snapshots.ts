import type { PioneerFileService } from '@pioneer/character/application';
import { CharacterId } from '@pioneer/character/domain';
import { CharacterSnapshotSource } from '@pioneer/identity/application';
import type { CharacterSnapshot } from '@pioneer/identity/domain';
import { NotFoundError, ValidationError } from '@pioneer/shared/kernel';
import type { UserId, Uuid } from '@pioneer/shared/kernel';

/**
 * Identity's `CharacterSnapshotSource` over the character context's Pioneer file export, so a bug report carries
 * the same versioned document a user could download. It lives in the composition root because neither context may
 * import the other. Export applies the character access policy, so only the owner's own characters are copied.
 *
 * The files service is built after identity (it needs identity's authenticator), so it is bound once both exist.
 */
export class PioneerCharacterSnapshots extends CharacterSnapshotSource {
  #files: PioneerFileService | undefined;

  /** Supplies the export; must happen before the first report is filed. */
  public bind(files: PioneerFileService): void {
    this.#files = files;
  }

  public override async take(actor: UserId, id: Uuid): Promise<CharacterSnapshot | undefined> {
    if (this.#files === undefined) {
      throw new Error('PioneerCharacterSnapshots used before it was bound to the Pioneer file service');
    }
    try {
      return await this.#files.export(actor, CharacterId.parse(id));
    } catch (error) {
      // A character that is gone, not the reporter's, or refused by the export must not stop the report.
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        return undefined;
      }
      throw error;
    }
  }
}
