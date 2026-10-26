import type { ChoiceValue, ContentId } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { Build, CharacterDocument } from './character-document';
import { SlotInvalidMessage } from './character-slot';

/** A feat an import found that no slot offers: it is kept on the character and breaks a rule until it is placed or dismissed. */
export interface UnplacedFeatBreak {
  readonly feat: ContentId;
  readonly reason: MessageDescriptor;
}

/**
 * The imported feats that break a rule because no slot holds them (ADR-0064): worked out on every read from the build's
 * list, so a feat a slot has since taken is never flagged, and nothing flagged is stored.
 */
export function unplacedFeatBreaks({ build }: Pick<CharacterDocument, 'build'>): readonly UnplacedFeatBreak[] {
  const picked = new Set<string>(Object.values(build.choices));
  return build.unplacedFeats
    .filter((feat) => !picked.has(feat))
    .map((feat) => ({ feat, reason: message(SlotInvalidMessage.NoSlot) }));
}

/** The build without `feat` among its unplaced feats; unchanged when it isn't one. */
export function withoutUnplacedFeat(build: Build, feat: ChoiceValue | ContentId): Build {
  const listed = build.unplacedFeats.some((each) => each === feat);
  return listed ? { ...build, unplacedFeats: build.unplacedFeats.filter((each) => each !== feat) } : build;
}
