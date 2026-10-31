import type { ChoiceValue, ContentId, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { Build, CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import type { UnplacedPickPatch } from './character-patch';
import { SlotInvalidMessage } from './character-slot';
import { HERITAGE_SLOT } from './character-slots';
import { withoutUnplacedFeat } from './unplaced-feats';

/** The picks an import found no slot for, as the build keeps them. */
export type UnplacedPicks = Partial<Pick<Build, 'lores' | 'unplacedFeats' | 'unplacedHeritage' | 'unplacedLanguages'>>;

/** What kind of imported pick no slot holds, besides a feat. */
export const UnplacedPickKind = {
  Heritage: 'heritage',
  Language: 'language',
} as const;
export type UnplacedPickKind = (typeof UnplacedPickKind)[keyof typeof UnplacedPickKind];

/** An imported heritage or language no slot holds: kept on the character, and breaks a rule until placed or dismissed. */
export interface UnplacedPickBreak {
  readonly kind: UnplacedPickKind;
  readonly pick: ContentId;
  readonly reason: MessageDescriptor;
}

/**
 * The imported heritage and languages that break a rule because no slot holds them (ADR-0064), worked out on every
 * read: a heritage is flagged while the heritage slot is empty, a language while no slot pick is it. Nothing flagged
 * is stored beyond the build's list.
 */
export function unplacedPickBreaks({ build }: Pick<CharacterDocument, 'build'>): readonly UnplacedPickBreak[] {
  const picked = new Set<string>(Object.values(build.choices));
  const heritage =
    build.unplacedHeritage === undefined || HERITAGE_SLOT in build.choices
      ? []
      : [
          {
            kind: UnplacedPickKind.Heritage,
            pick: build.unplacedHeritage,
            reason: message(SlotInvalidMessage.NoHeritageSlot),
          },
        ];
  const languages = build.unplacedLanguages
    .filter((language) => !picked.has(language))
    .map((pick) => ({ kind: UnplacedPickKind.Language, pick, reason: message(SlotInvalidMessage.NoLanguageSlot) }));
  return [...heritage, ...languages];
}

/** The build without the unplaced pick `patch` dismisses; unchanged when it isn't listed. */
export function dismissedPick(build: Build, patch: UnplacedPickPatch): Build {
  switch (patch.field) {
    case CharacterPatchField.DismissUnplacedFeat: {
      return withoutUnplacedFeat(build, patch.feat);
    }
    case CharacterPatchField.DismissUnplacedHeritage: {
      return build.unplacedHeritage === patch.heritage ? { ...build, unplacedHeritage: undefined } : build;
    }
    case CharacterPatchField.DismissUnplacedLanguage: {
      return { ...build, unplacedLanguages: build.unplacedLanguages.filter((each) => each !== patch.language) };
    }
    default: {
      const unreachable: never = patch;
      throw new TypeError(`Unhandled unplaced pick dismissal: ${JSON.stringify(unreachable)}`);
    }
  }
}

/**
 * The build without the unplaced picks that a pick of `value` in `slot` places: the feat or language it names, and the
 * unplaced heritage when `slot` is the heritage slot.
 */
export function withoutPlacedPick(build: Build, slot: SlotKey, value: ChoiceValue | ContentId): Build {
  const feats = withoutUnplacedFeat(build, value);
  const languages = feats.unplacedLanguages.filter((each) => each !== value);
  return {
    ...feats,
    unplacedLanguages: languages,
    unplacedHeritage: slot === HERITAGE_SLOT ? undefined : feats.unplacedHeritage,
  };
}
