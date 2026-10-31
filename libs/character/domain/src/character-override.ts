import { RuleInPlay } from '@pioneer/rules/engine';
import {
  ChangeMode,
  ContentId,
  contentId,
  EntrySlug,
  ModifierType,
  OriginHopKind,
  PackId,
  RuleElementKey,
} from '@pioneer/rules/sdk';
import type { Temporal, UserId, ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import type { OverridePatch } from './character-patch';
import { OVERRIDE_REVISIONS_MAX, OverrideMode, OVERRIDES_MAX, overrideTime } from './override-schema';
import type { Override, OverrideId, OverrideInput, OverrideRevision } from './override-schema';

/** The overrides in force: the ones nobody has removed. */
export function activeOverrides(document: CharacterDocument): readonly Override[] {
  return document.overrides.filter((override) => override.removed === undefined);
}

/** The pack and slug of the entry every override's rule elements sit on. */
const OVERRIDES_ENTRY = ContentId.parse(contentId(PackId.parse('character'), EntrySlug.parse('effect:overrides')));

/** The source an override's rule element cites: it has no book. */
const OVERRIDE_SOURCE = { kind: 'book', book: 'player-core', page: 1 } as const;

/** The rule element of one override: an adjust is a typed flat modifier, a set a `Change` that pins the value. */
function elementOf(override: Override): unknown {
  const { target, value, predicate } = override;
  const common = predicate === undefined ? {} : { predicate };
  return override.mode === OverrideMode.Set
    ? { key: RuleElementKey.Change, selector: target, mode: ChangeMode.Override, value, ...common }
    : {
        key: RuleElementKey.FlatModifier,
        selectors: [target],
        type: override.type ?? ModifierType.Untyped,
        value,
        ...common,
      };
}

/**
 * The rule elements the character's overrides compile to, each with an `override` hop naming who set it, when and why,
 * in the order they were added. A removed override compiles to nothing, so removing one restores the total without it.
 */
export function overrideRules(document: CharacterDocument): readonly RuleInPlay[] {
  return activeOverrides(document).map((override, index) =>
    RuleInPlay.parse({
      element: elementOf(override),
      origin: {
        hops: [{ kind: OriginHopKind.Override, by: override.by, at: override.at, note: override.reason }],
        entry: OVERRIDES_ENTRY,
        sources: [OVERRIDE_SOURCE],
      },
      rule: index,
    }),
  );
}

/** What the caller of an override edit supplies: who makes it, when, and the id a new override takes. */
export interface OverrideEdit {
  readonly actor: UserId;
  readonly now: Temporal.Instant;
  readonly newOverrideId?: OverrideId | undefined;
}

/** The previous state of `override`, to keep when it is edited. */
function revisionOf(override: Override): OverrideRevision {
  const { by, at, value, type, predicate, reason } = override;
  return { by, at, value, type, predicate, reason };
}

/** `override` as an edit changes it: the new inputs, the editor and time, and the state it replaces kept. */
function revised(override: Override, input: OverrideInput, edit: OverrideEdit): Override {
  return {
    ...override,
    target: input.target,
    mode: input.mode,
    value: input.value,
    type: input.type,
    predicate: input.predicate,
    reason: input.reason,
    by: edit.actor,
    at: overrideTime(edit.now),
    revisions: [...override.revisions, revisionOf(override)],
  };
}

/** The override with `id`, if the document has it and nobody has removed it. */
export function overrideOf(document: CharacterDocument, id: OverrideId): Override | undefined {
  return activeOverrides(document).find((override) => override.id === id);
}

/** Why an override edit cannot be made. */
export const OverrideProblem = { Unknown: 'unknown', Full: 'full', Exhausted: 'exhausted' } as const;
export type OverrideProblem = ValueOf<typeof OverrideProblem>;

/** What stops `patch` from changing the document, or undefined when it can: an override that isn't there, or one too many. */
export function overrideProblem(document: CharacterDocument, patch: OverridePatch): OverrideProblem | undefined {
  if (patch.field === CharacterPatchField.AddOverride) {
    return document.overrides.length >= OVERRIDES_MAX ? OverrideProblem.Full : undefined;
  }
  const found = overrideOf(document, patch.id);
  if (found === undefined) {
    return OverrideProblem.Unknown;
  }
  return patch.field === CharacterPatchField.EditOverride && found.revisions.length >= OVERRIDE_REVISIONS_MAX
    ? OverrideProblem.Exhausted
    : undefined;
}

/** The override an add makes: the author's inputs, with who added it and when, under the id its caller made. */
function added(input: OverrideInput, edit: OverrideEdit): Override {
  if (edit.newOverrideId === undefined) {
    throw new TypeError('An added override needs the id its caller makes');
  }
  return { id: edit.newOverrideId, ...input, by: edit.actor, at: overrideTime(edit.now), revisions: [] };
}

/** `document` with the override `id` replaced by what `change` makes of it. */
function withChanged(
  document: CharacterDocument,
  id: OverrideId,
  change: (override: Override) => Override,
): CharacterDocument {
  return { ...document, overrides: document.overrides.map((each) => (each.id === id ? change(each) : each)) };
}

/**
 * The document with the override edit made. An added override takes `edit.newOverrideId`; an edit keeps what it
 * replaces; a removal keeps the override, marked removed with who removed it, when and why. A patch
 * `overrideProblem` refuses is a caller's bug and throws.
 */
export function withOverrideEdit(
  document: CharacterDocument,
  patch: OverridePatch,
  edit: OverrideEdit,
): CharacterDocument {
  if (overrideProblem(document, patch) !== undefined) {
    throw new TypeError(`Override edit ${patch.field} is not allowed on this document`);
  }
  switch (patch.field) {
    case CharacterPatchField.AddOverride: {
      return { ...document, overrides: [...document.overrides, added(patch.override, edit)] };
    }
    case CharacterPatchField.EditOverride: {
      return withChanged(document, patch.id, (each) => revised(each, patch.override, edit));
    }
    case CharacterPatchField.RemoveOverride: {
      const removed = { by: edit.actor, at: overrideTime(edit.now), reason: patch.reason };
      return withChanged(document, patch.id, (each) => ({ ...each, removed }));
    }
    default: {
      const unreachable: never = patch;
      throw new TypeError(`Unhandled override edit: ${JSON.stringify(unreachable)}`);
    }
  }
}
