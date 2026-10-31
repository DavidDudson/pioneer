import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';

/** The edits that add, change or remove an override. */
export type OverridePatch = Extract<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.AddOverride
      | typeof CharacterPatchField.EditOverride
      | typeof CharacterPatchField.RemoveOverride;
  }
>;

/** The edits that add, switch or remove a custom effect. */
export type CustomEffectPatch = Extract<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.AddCustomEffect
      | typeof CharacterPatchField.ToggleCustomEffect
      | typeof CharacterPatchField.RemoveCustomEffect;
  }
>;

const OVERRIDE_FIELDS: ReadonlySet<CharacterPatchField> = new Set<OverridePatch['field']>([
  CharacterPatchField.AddOverride,
  CharacterPatchField.EditOverride,
  CharacterPatchField.RemoveOverride,
]);

const CUSTOM_EFFECT_FIELDS: ReadonlySet<CharacterPatchField> = new Set<CustomEffectPatch['field']>([
  CharacterPatchField.AddCustomEffect,
  CharacterPatchField.ToggleCustomEffect,
  CharacterPatchField.RemoveCustomEffect,
]);

export function isOverridePatch(patch: CharacterPatch): patch is OverridePatch {
  return OVERRIDE_FIELDS.has(patch.field);
}

export function isCustomEffectPatch(patch: CharacterPatch): patch is CustomEffectPatch {
  return CUSTOM_EFFECT_FIELDS.has(patch.field);
}
