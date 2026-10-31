import type { CharacterPatch, CharacterPatchField } from './character-patch';

/** The edits that take an imported feat, heritage or language off what no slot holds, or a custom language off the build. */
export type UnplacedPickPatch = Extract<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.DismissUnplacedFeat
      | typeof CharacterPatchField.DismissUnplacedHeritage
      | typeof CharacterPatchField.DismissUnplacedLanguage
      | typeof CharacterPatchField.RemoveCustomLanguage;
  }
>;
