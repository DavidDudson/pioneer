import { ContentId, ContentKind, SlotKey } from '@pioneer/rules/sdk';
import type { ContentText } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { BoostSource } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { SlotSubjectKind } from './character-slot';
import type { CharacterSlot, SlotSubject } from './character-slot';
import { SkillSlotKind } from './skill-training';
import type { SlotContent } from './slot-reads';

/** Where a choice comes from: the character's class, ancestry or background, its spellcasting, an archetype, or general progression. */
export const ChoiceSourceKind = {
  Class: 'class',
  Ancestry: 'ancestry',
  Background: 'background',
  Spellcasting: 'spellcasting',
  Archetype: 'archetype',
  General: 'general',
} as const;
export type ChoiceSourceKind = ValueOf<typeof ChoiceSourceKind>;

/** A choice's source and, where one names it, the entry it comes from: the class, ancestry, background or archetype. */
export interface ChoiceSource {
  readonly kind: ChoiceSourceKind;
  readonly name: ContentText | undefined;
}

/** The trait that marks an archetype's feat. */
const ARCHETYPE_TRAIT = 'archetype';

const ROOT_SOURCES: ReadonlyMap<ContentKind, ChoiceSourceKind> = new Map([
  [ContentKind.Ancestry, ChoiceSourceKind.Ancestry],
  [ContentKind.Heritage, ChoiceSourceKind.Ancestry],
  [ContentKind.Background, ChoiceSourceKind.Background],
  [ContentKind.Class, ChoiceSourceKind.Class],
]);

const BOOST_SOURCES: Readonly<Record<BoostSource, ChoiceSourceKind>> = {
  [BoostSource.Ancestry]: ChoiceSourceKind.Ancestry,
  [BoostSource.Background]: ChoiceSourceKind.Background,
  [BoostSource.Class]: ChoiceSourceKind.Class,
  [BoostSource.SecondClass]: ChoiceSourceKind.Class,
  [BoostSource.Free]: ChoiceSourceKind.General,
};

const SKILL_SOURCES: Readonly<Record<SkillSlotKind, ChoiceSourceKind>> = {
  [SkillSlotKind.Training]: ChoiceSourceKind.Class,
  [SkillSlotKind.Increase]: ChoiceSourceKind.General,
};

/** The name of the entry the character picked for the root slot of `root`. */
function rootName(document: CharacterDocument, content: SlotContent, root: ContentKind): ContentText | undefined {
  const picked = document.build.choices[SlotKey.parse(root)];
  const id = ContentId.safeParse(picked);
  return id.success ? content.lookup.entry(id.data)?.name : undefined;
}

/** The root slot whose pick names each kind of source; none for those that name no entry of the character's own. */
const NAMING_ROOTS: Readonly<Record<ChoiceSourceKind, ContentKind | undefined>> = {
  [ChoiceSourceKind.Class]: ContentKind.Class,
  [ChoiceSourceKind.Spellcasting]: ContentKind.Class,
  [ChoiceSourceKind.Ancestry]: ContentKind.Ancestry,
  [ChoiceSourceKind.Background]: ContentKind.Background,
  [ChoiceSourceKind.Archetype]: undefined,
  [ChoiceSourceKind.General]: undefined,
};

/** The name the source kind is read with: the character's class, ancestry or background; none for the rest. */
function nameOf(kind: ChoiceSourceKind, document: CharacterDocument, content: SlotContent): ContentText | undefined {
  const root = NAMING_ROOTS[kind];
  return root === undefined ? undefined : rootName(document, content, root);
}

/** The source of a `ChoiceSet` by the kind of entry that asks it; any kind not listed is general progression. */
const ENTRY_SOURCES: ReadonlyMap<ContentKind, ChoiceSourceKind> = new Map([
  ...ROOT_SOURCES,
  [ContentKind.ClassFeature, ChoiceSourceKind.Class],
  [ContentKind.AncestryFeature, ChoiceSourceKind.Ancestry],
  [ContentKind.Archetype, ChoiceSourceKind.Archetype],
  [ContentKind.VariantRule, ChoiceSourceKind.Archetype],
]);

/** The source of a `ChoiceSet` on `entry`, by the kind of entry that asks it. */
function entrySource(entry: ContentId | undefined, content: SlotContent): ChoiceSourceKind {
  const found = entry === undefined ? undefined : content.lookup.entry(entry);
  if (found === undefined) {
    return ChoiceSourceKind.General;
  }
  if (found.kind === ContentKind.Feat) {
    return found.rollOptions.some((option) => option === `trait:${ARCHETYPE_TRAIT}`)
      ? ChoiceSourceKind.Archetype
      : ChoiceSourceKind.General;
  }
  return ENTRY_SOURCES.get(found.kind) ?? ChoiceSourceKind.General;
}

/** The kind of source a slot comes from. */
function kindOf(subject: SlotSubject, content: SlotContent): ChoiceSourceKind {
  switch (subject.kind) {
    case SlotSubjectKind.Root: {
      return ROOT_SOURCES.get(subject.content) ?? ChoiceSourceKind.General;
    }
    case SlotSubjectKind.Boost: {
      return BOOST_SOURCES[subject.source];
    }
    case SlotSubjectKind.Skill: {
      return SKILL_SOURCES[subject.source];
    }
    case SlotSubjectKind.Language: {
      return subject.entry === undefined ? ChoiceSourceKind.Ancestry : entrySource(subject.entry, content);
    }
    case SlotSubjectKind.Choice: {
      return entrySource(subject.entry, content);
    }
    case SlotSubjectKind.Spell:
    case SlotSubjectKind.Signature: {
      return ChoiceSourceKind.Spellcasting;
    }
    case SlotSubjectKind.Flaw: {
      return ChoiceSourceKind.Ancestry;
    }
    default: {
      const unreachable: never = subject;
      throw new TypeError(`Unhandled slot subject: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** Where a slot's choice comes from, read from its subject and the entry that asks it, never from its label; none when hidden. */
export function choiceSourceOf(
  slot: CharacterSlot,
  document: CharacterDocument,
  content: SlotContent,
): ChoiceSource | undefined {
  if (!('subject' in slot)) {
    return undefined;
  }
  const { subject } = slot;
  const kind = kindOf(subject, content);
  const entryName =
    subject.kind === SlotSubjectKind.Choice && kind === ChoiceSourceKind.Archetype ? subject.entryName : undefined;
  return { kind, name: entryName ?? nameOf(kind, document, content) };
}

/** A source of `kind`, named as the character's class, ancestry or background where it has one (#1683). */
export function sourceOfKind(kind: ChoiceSourceKind, document: CharacterDocument, content: SlotContent): ChoiceSource {
  return { kind, name: nameOf(kind, document, content) };
}
