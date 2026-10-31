import { RuleInPlay } from '@pioneer/rules/engine';
import {
  ChangeMode,
  ContentId,
  contentId,
  ContentText,
  EntrySlug,
  ModifierType,
  OriginHopKind,
  PackId,
  RuleElementKey,
} from '@pioneer/rules/sdk';
import type { Temporal, UserId, ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import { CUSTOM_EFFECT_TOGGLES_MAX, CUSTOM_EFFECTS_MAX, CustomEffectSchema } from './custom-effect-schema';
import type { CustomEffect, CustomEffectId, CustomEffectInput, CustomEffectLine } from './custom-effect-schema';
import type { CustomEffectPatch } from './override-patches';
import { OverrideMode, OverrideRole, overrideTime } from './override-schema';

/** The custom effects in force: the ones nobody has removed. */
export function activeCustomEffects(document: CharacterDocument): readonly CustomEffect[] {
  return document.customEffects.filter((effect) => effect.removed === undefined);
}

/** The pack and slug of the entry every custom effect line's rule element sits on. */
const CUSTOM_EFFECTS_ENTRY = ContentId.parse(
  contentId(PackId.parse('character'), EntrySlug.parse('effect:custom-effects')),
);

/** The source a custom effect line cites: it has no book. */
const CUSTOM_EFFECT_SOURCE = { kind: 'book', book: 'player-core', page: 1 } as const;

/** The rule element of one line: an adjust is a typed flat modifier, a set a `Change` that pins the value. */
function elementOf(name: CustomEffect['name'], line: CustomEffectLine): unknown {
  const display = { label: ContentText.parse(name) };
  const predicate = line.predicate === undefined ? {} : { predicate: line.predicate };
  return line.mode === OverrideMode.Set
    ? {
        key: RuleElementKey.Change,
        selector: line.target,
        mode: ChangeMode.Override,
        value: line.value,
        display,
        ...predicate,
      }
    : {
        key: RuleElementKey.FlatModifier,
        selectors: [line.target],
        type: line.type ?? ModifierType.Untyped,
        value: line.value,
        display,
        ...predicate,
      };
}

/**
 * The rule elements the character's switched-on custom effects compile to, one per line, each with an `override` hop
 * naming who added the effect, when and why, and the effect's name as its label, so the breakdown lists them under it. Off or removed compiles to nothing.
 */
export function customEffectRules(document: CharacterDocument): readonly RuleInPlay[] {
  const lines = activeCustomEffects(document)
    .filter((effect) => effect.enabled)
    .flatMap((effect) => effect.lines.map((line) => ({ effect, line })));
  return lines.map(({ effect, line }, index) =>
    RuleInPlay.parse({
      element: elementOf(effect.name, line),
      origin: {
        hops: [{ kind: OriginHopKind.Override, by: effect.by, at: effect.at, note: effect.reason }],
        entry: CUSTOM_EFFECTS_ENTRY,
        sources: [CUSTOM_EFFECT_SOURCE],
      },
      rule: index,
    }),
  );
}

/** What the caller of a custom effect edit supplies: who makes it, when, and the id a new effect takes. */
export interface CustomEffectEdit {
  readonly actor: UserId;
  /** What the actor is to the character; absent reads as its player. */
  readonly actorRole?: OverrideRole | undefined;
  readonly now: Temporal.Instant;
  readonly newCustomEffectId?: CustomEffectId | undefined;
}

/** The custom effect with `id`, if the document has it and nobody has removed it. */
export function customEffectOf(document: CharacterDocument, id: CustomEffectId): CustomEffect | undefined {
  return activeCustomEffects(document).find((effect) => effect.id === id);
}

/** Why a custom effect edit cannot be made. */
export const CustomEffectProblem = { Unknown: 'unknown', Full: 'full' } as const;
export type CustomEffectProblem = ValueOf<typeof CustomEffectProblem>;

/** What stops `patch` from changing the document, or undefined when it can. */
export function customEffectProblem(
  document: CharacterDocument,
  patch: CustomEffectPatch,
): CustomEffectProblem | undefined {
  if (patch.field === CharacterPatchField.AddCustomEffect) {
    return document.customEffects.length >= CUSTOM_EFFECTS_MAX ? CustomEffectProblem.Full : undefined;
  }
  return customEffectOf(document, patch.id) === undefined ? CustomEffectProblem.Unknown : undefined;
}

/** The effect an add makes: the author's inputs, with who added it and when, on, under the id its caller made. */
function added(input: CustomEffectInput, edit: CustomEffectEdit): CustomEffect {
  if (edit.newCustomEffectId === undefined) {
    throw new TypeError('An added custom effect needs the id its caller makes');
  }
  return CustomEffectSchema.parse({
    id: edit.newCustomEffectId,
    ...input,
    by: edit.actor,
    byRole: edit.actorRole ?? OverrideRole.Player,
    at: overrideTime(edit.now),
    enabled: true,
    toggles: [],
  });
}

/** `document` with the effect `id` replaced by what `change` makes of it. */
function withChanged(
  document: CharacterDocument,
  id: CustomEffectId,
  change: (effect: CustomEffect) => CustomEffect,
): CharacterDocument {
  return { ...document, customEffects: document.customEffects.map((each) => (each.id === id ? change(each) : each)) };
}

/**
 * The document with the custom effect edit made. A toggle records who, in what role and when, and one that leaves the
 * effect as it was changes nothing; a removal keeps the effect, marked removed. A patch `customEffectProblem` refuses
 * is a caller's bug and throws.
 */
export function withCustomEffectEdit(
  document: CharacterDocument,
  patch: CustomEffectPatch,
  edit: CustomEffectEdit,
): CharacterDocument {
  if (customEffectProblem(document, patch) !== undefined) {
    throw new TypeError(`Custom effect edit ${patch.field} is not allowed on this document`);
  }
  switch (patch.field) {
    case CharacterPatchField.AddCustomEffect: {
      return { ...document, customEffects: [...document.customEffects, added(patch.effect, edit)] };
    }
    case CharacterPatchField.ToggleCustomEffect: {
      return withChanged(document, patch.id, (each) =>
        each.enabled === patch.enabled
          ? each
          : {
              ...each,
              enabled: patch.enabled,
              toggles: [
                ...each.toggles,
                {
                  by: edit.actor,
                  byRole: edit.actorRole ?? OverrideRole.Player,
                  at: overrideTime(edit.now),
                  enabled: patch.enabled,
                },
              ].slice(-CUSTOM_EFFECT_TOGGLES_MAX),
            },
      );
    }
    case CharacterPatchField.RemoveCustomEffect: {
      const removed = { by: edit.actor, at: overrideTime(edit.now), reason: patch.reason };
      return withChanged(document, patch.id, (each) => ({ ...each, removed }));
    }
    default: {
      const unreachable: never = patch;
      throw new TypeError(`Unhandled custom effect edit: ${JSON.stringify(unreachable)}`);
    }
  }
}
