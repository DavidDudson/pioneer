import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import type { SpellAccessPatch, UnplacedFeatPatch } from './character-patch';
import { withoutUnplacedFeat } from './unplaced-feats';

/** The edits that add to or take from a list the build keeps: spell access, or the feats an import found no slot for. */
export type BuildListPatch = SpellAccessPatch | UnplacedFeatPatch;

/**
 * The document with the build's list changed by `patch`. Spell access gains `patch.spell` at the end unless listed, or
 * loses it, and a pick of a spell taken out stays (#478); an unplaced feat is taken off its list.
 */
export function withBuildListEdit(document: CharacterDocument, patch: BuildListPatch): CharacterDocument {
  const { build } = document;
  switch (patch.field) {
    case CharacterPatchField.GrantSpellAccess: {
      const spellAccess = build.spellAccess.includes(patch.spell)
        ? build.spellAccess
        : [...build.spellAccess, patch.spell];
      return { ...document, build: { ...build, spellAccess } };
    }
    case CharacterPatchField.RevokeSpellAccess: {
      return {
        ...document,
        build: { ...build, spellAccess: build.spellAccess.filter((spell) => spell !== patch.spell) },
      };
    }
    case CharacterPatchField.DismissUnplacedFeat: {
      return { ...document, build: withoutUnplacedFeat(build, patch.feat) };
    }
    default: {
      const unreachable: never = patch;
      throw new TypeError(`Unhandled build list edit: ${JSON.stringify(unreachable)}`);
    }
  }
}
