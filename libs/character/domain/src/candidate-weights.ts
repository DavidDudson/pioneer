import { Attribute, ContentId } from '@pioneer/rules/sdk';
import type { ChoiceValue } from '@pioneer/rules/sdk';

import { SlotSubjectKind } from './character-slot';
import type { CharacterSlot, SlotStatus } from './character-slot';
import { CLASS_SLOT } from './character-slots';
import { themeWeight } from './generation-theme';
import type { GenerationTheme } from './generation-theme';
import type { Weighted } from './picks';
import type { SlotContent } from './slot-offer';

/** A slot with nothing picked. */
type OpenSlot = Extract<CharacterSlot, { status: typeof SlotStatus.Open }>;

/** A theme, and the content a pick's attributes are read from. */
export interface Themed {
  readonly theme: GenerationTheme;
  readonly content: SlotContent;
}

const ATTRIBUTES: readonly Attribute[] = Object.values(Attribute);
/** An attribute a feat's prerequisite predicate reads: `attribute:str:mod`. */
const ATTRIBUTE_READ = /attribute:(?<key>str|dex|con|int|wis|cha):/gu;

/** The attributes a feat's prerequisites read, as its predicate names them. */
function featAttributes(content: SlotContent, pick: ChoiceValue): readonly Attribute[] {
  const id = ContentId.safeParse(pick);
  const predicate = id.success ? content.feats.feat(id.data)?.predicate : undefined;
  const named = JSON.stringify(predicate ?? []).matchAll(ATTRIBUTE_READ);
  return ATTRIBUTES.filter((attribute) => [...named].some((found) => found.groups?.['key'] === attribute));
}

/** The attributes `pick` raises or uses in `slot`: a boost's own, a class's key attributes, a feat's prerequisites. */
function attributesOf(slot: OpenSlot, pick: ChoiceValue, content: SlotContent): readonly Attribute[] {
  if (slot.subject.kind === SlotSubjectKind.Boost) {
    return ATTRIBUTES.filter((attribute) => attribute === pick);
  }
  if (slot.key === CLASS_SLOT) {
    const id = ContentId.safeParse(pick);
    return (id.success ? content.boosts.keyAttribute(id.data) : undefined) ?? [];
  }
  return slot.subject.kind === SlotSubjectKind.Choice ? featAttributes(content, pick) : [];
}

/** `picks`, each weighed by the attributes it raises or uses under `theme`: favoured ones come up more often. */
export function weighCandidates(
  slot: OpenSlot,
  picks: readonly ChoiceValue[],
  { theme, content }: Themed,
): readonly Weighted<ChoiceValue>[] {
  return picks.map((item) => ({ item, weight: themeWeight(theme, attributesOf(slot, item, content)) }));
}
