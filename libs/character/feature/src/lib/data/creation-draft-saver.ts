import { inject, Injectable } from '@angular/core';
import { CharacterContract, CharacterName, CharacterPatchField } from '@pioneer/character/domain';
import type { CharacterId } from '@pioneer/character/domain';
import { AncestryId } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { ApiClient } from '@pioneer/shared/web';

import { CharacterStore } from './character-store';
import { draftPicks } from './creation-draft';
import type { CreationDraft } from './creation-draft';

/** Saves a character in the making: the one write the creation stepper's origin steps make. */
@Injectable()
export class CreationDraftSaver {
  readonly #store = inject(CharacterStore);
  readonly #api = inject(ApiClient);

  /**
   * Makes the character from the name and ancestry, then picks the rest of the draft in its slots, each against the
   * version the last write answered with. Answers the new character's id.
   */
  public async save(draft: CreationDraft, subclassSlot: SlotKey | undefined): Promise<CharacterId> {
    const created = await this.#store.create({
      name: CharacterName.parse(draft.name),
      ancestry: AncestryId.parse(draft.ancestry),
    });
    let { version } = created;
    for (const [slot, selection] of draftPicks(draft, subclassSlot)) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- each write needs the version the one before answered with
      const saved = await this.#api.call(CharacterContract.patch, {
        params: { id: created.id },
        body: { expectedVersion: version, patch: { field: CharacterPatchField.SelectSlot, slot, selection } },
      });
      ({ version } = saved.character);
    }
    return created.id;
  }
}
