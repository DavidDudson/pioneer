import type { Temporal } from '@pioneer/shared/kernel';

import { withBuildListEdit } from './build-list-edits';
import type { CharacterDocument } from './character-document';
import { withOverrideEdit } from './character-override';
import { CharacterPatchField } from './character-patch';
import type { DocumentPatch } from './character-patch';
import { withProse } from './character-prose';
import type { EditInputs } from './item-purchase';

/**
 * The document with `patch` made: a spell access or an unplaced pick on the build, an override, or a prose field. An
 * override edit takes its author from `inputs.actor`, and its id from `inputs.newOverrideId` when it adds one.
 */
export function withDocumentEdit(
  document: CharacterDocument,
  patch: DocumentPatch,
  { inputs, now }: DocumentEditContext,
): CharacterDocument {
  switch (patch.field) {
    case CharacterPatchField.GrantSpellAccess:
    case CharacterPatchField.RevokeSpellAccess:
    case CharacterPatchField.DismissUnplacedFeat:
    case CharacterPatchField.DismissUnplacedHeritage:
    case CharacterPatchField.DismissUnplacedLanguage: {
      return withBuildListEdit(document, patch);
    }
    case CharacterPatchField.AddOverride:
    case CharacterPatchField.EditOverride:
    case CharacterPatchField.RemoveOverride: {
      if (inputs.actor === undefined) {
        throw new TypeError('An override edit needs the user who makes it');
      }
      return withOverrideEdit(document, patch, {
        actor: inputs.actor,
        actorRole: inputs.actorRole,
        now,
        newOverrideId: inputs.newOverrideId,
      });
    }
    case CharacterPatchField.SetAppearance:
    case CharacterPatchField.SetPersonality: {
      return withProse(document, patch);
    }
    default: {
      const unreachable: never = patch;
      throw new TypeError(`Unhandled document edit: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** What a document edit reads besides the patch: the caller's inputs, and when the edit is made. */
export interface DocumentEditContext {
  readonly inputs: EditInputs;
  readonly now: Temporal.Instant;
}
