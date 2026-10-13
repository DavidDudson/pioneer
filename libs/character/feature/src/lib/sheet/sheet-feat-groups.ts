import { characterGrants, featSlots } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import {
  ContentId,
  ContentKind,
  DisplayCategory,
  FeatCategory,
  OriginHopKind,
  RuleElementKey,
} from '@pioneer/rules/sdk';
import type { ContentEntry, ContentRegistry, OriginHop, RuleElement, SlotKey } from '@pioneer/rules/sdk';

import { sheetSlotContent } from './sheet-slot-content';

/** A feat entry, as the envelope holds it. */
type FeatEntry = Extract<ContentEntry, { kind: typeof ContentKind.Feat }>;

/** The slot types the feat groups follow, in the order the sheet lists them. */
const GROUP_ORDER: readonly FeatCategory[] = [
  FeatCategory.Ancestry,
  FeatCategory.Class,
  FeatCategory.Skill,
  FeatCategory.General,
  FeatCategory.Bonus,
];

/** What a rule element of one of these keys does to the character: nothing a number or a roll shows. */
const GRANTING_KEYS: ReadonlySet<RuleElementKey> = new Set([RuleElementKey.GrantItem, RuleElementKey.ChoiceSet]);

/** What a feat's display category is derived from. */
export type FeatDerivation = Pick<FeatEntry, 'data' | 'display' | 'rules'>;

/** One effective feat as the sheet lists it. */
export interface SheetFeatRow {
  readonly id: ContentId;
  readonly name: string;
  /** The level it was taken at, when a slot or the feat that granted it says; none for a class feature's grant. */
  readonly level: number | undefined;
  readonly category: DisplayCategory;
  /** What it relates to: the skill of a skill feat, the choice made on it (Domain Initiate's domain). */
  readonly note: string | undefined;
  /** The entry that granted it, for a feat a feature gave rather than a slot took. */
  readonly from: string | undefined;
}

/** A feat row with the slot type it fills. */
interface CategorisedRow {
  readonly category: FeatCategory;
  readonly row: SheetFeatRow;
}

/** The feats of one slot type. */
export interface SheetFeatGroup {
  readonly category: FeatCategory;
  readonly feats: readonly SheetFeatRow[];
}

/**
 * How a feat shows (play-and-campaigns.md, Feat display): the content's `display.category` when it has one, else
 * `active` for a feat that is an action or grants one, `modifier` for one with any other rule element, `grant-only`
 * for one with only grants and choices, and `narrative` for one with no rule elements.
 */
export function featDisplayCategory(
  entry: FeatDerivation,
  grantsAction: (rule: RuleElement) => boolean,
): DisplayCategory {
  if (entry.display?.category !== undefined) {
    return entry.display.category;
  }
  if (entry.data.action !== undefined || entry.rules.some((rule) => grantsAction(rule))) {
    return DisplayCategory.Active;
  }
  if (entry.rules.some((rule) => !GRANTING_KEYS.has(rule.key))) {
    return DisplayCategory.Modifier;
  }
  return entry.rules.length > 0 ? DisplayCategory.GrantOnly : DisplayCategory.Narrative;
}

function featEntries(registry: ContentRegistry): ReadonlyMap<ContentId, FeatEntry> {
  const feats = registry.packs
    .flatMap((pack) => pack.otherEntries)
    .filter((entry): entry is FeatEntry => entry.kind === ContentKind.Feat);
  return new Map(feats.map((entry) => [entry.id, entry]));
}

/** What `takenAt` reads the origin chain against. */
interface TakenContext {
  readonly levels: ReadonlyMap<SlotKey, number>;
  readonly feats: ReadonlyMap<ContentId, FeatEntry>;
  readonly nameOf: (id: ContentId) => string | undefined;
}

/**
 * The level a slot took a feat at and the entry that granted it, from the chain of hops that put it on the character.
 * A feat another feat grants was not taken at a slot: it says "from" that feat, so hiding the granting feat loses
 * nothing.
 */
function takenAt(
  hops: readonly OriginHop[],
  { levels, feats, nameOf }: TakenContext,
): Pick<SheetFeatRow, 'level' | 'from'> {
  const picked = hops.findLast((each) => each.kind === OriginHopKind.Choice && levels.has(each.slot));
  const last = hops.at(-1);
  const grant = last?.kind === OriginHopKind.Grant ? last : undefined;
  const byFeat = grant !== undefined && feats.has(grant.by);
  const level = picked?.kind === OriginHopKind.Choice && !byFeat ? levels.get(picked.slot) : undefined;
  return { level, from: grant !== undefined && (picked === undefined || byFeat) ? nameOf(grant.by) : undefined };
}

/**
 * The character's effective feats grouped by the slot type they fill: ancestry, class, skill, general and bonus, each
 * with the level it was taken at, its display category and a note on what it relates to. A group with no feats is left
 * out.
 */
export function sheetFeatGroups(registry: ContentRegistry, character: Character): readonly SheetFeatGroup[] {
  const content = sheetSlotContent(registry);
  const nameOf = (id: ContentId): string | undefined => content.lookup.entry(id)?.name;
  const entries = featEntries(registry);
  const levels = new Map<SlotKey, number>(featSlots(character.document, content).map((slot) => [slot.key, slot.level]));
  const resolution = characterGrants(character.document, content);
  const grantsAction = (rule: RuleElement): boolean =>
    rule.key === RuleElementKey.GrantItem &&
    typeof rule.item === 'string' &&
    content.lookup.entry(rule.item)?.kind === ContentKind.Action;
  const noteOf = (feat: FeatEntry): string | undefined => {
    const answered = resolution.answered.find((slot) => slot.origin.entry === feat.id);
    if (answered !== undefined) {
      const picked = String(answered.pick);
      const pick = ContentId.safeParse(answered.pick);
      return (pick.success ? nameOf(pick.data) : undefined) ?? picked;
    }
    const [skill] = feat.data.skills ?? [];
    return skill?.replace(/^skill:/u, '');
  };
  const rows = resolution.items.flatMap((item): CategorisedRow[] => {
    const feat = entries.get(item.entry.id);
    if (feat === undefined) {
      return [];
    }
    const { level, from } = takenAt(item.origin.hops, { levels, feats: entries, nameOf });
    return [
      {
        category: feat.data.category,
        row: {
          id: feat.id,
          name: feat.name,
          level,
          category: featDisplayCategory(feat, grantsAction),
          note: noteOf(feat),
          from,
        },
      },
    ];
  });
  return GROUP_ORDER.flatMap((category): SheetFeatGroup[] => {
    const feats = rows
      .filter((each) => each.category === category)
      .map((each) => each.row)
      .toSorted((left, right) => (left.level ?? 0) - (right.level ?? 0) || left.name.localeCompare(right.name));
    return feats.length === 0 ? [] : [{ category, feats }];
  });
}

/** The heading of each group of feats. */
export const FEAT_GROUP_MESSAGES: Readonly<Record<FeatCategory, string>> = {
  [FeatCategory.Ancestry]: 'character.sheet.feats.group.ancestry',
  [FeatCategory.Class]: 'character.sheet.feats.group.class',
  [FeatCategory.Skill]: 'character.sheet.feats.group.skill',
  [FeatCategory.General]: 'character.sheet.feats.group.general',
  [FeatCategory.Bonus]: 'character.sheet.feats.group.bonus',
};

/** The label of each display category. */
export const FEAT_DISPLAY_MESSAGES: Readonly<Record<DisplayCategory, string>> = {
  [DisplayCategory.Active]: 'character.sheet.feats.display.active',
  [DisplayCategory.Modifier]: 'character.sheet.feats.display.modifier',
  [DisplayCategory.GrantOnly]: 'character.sheet.feats.display.grantOnly',
  [DisplayCategory.Narrative]: 'character.sheet.feats.display.narrative',
};

/**
 * `groups` as the user has them filtered: feats that only grant something else are folded away (their products say
 * "from Feat X" through their origin) unless the user shows them; a group left with no feats goes too.
 */
export function visibleFeatGroups(
  groups: readonly SheetFeatGroup[],
  showGrantOnly: boolean,
): readonly SheetFeatGroup[] {
  if (showGrantOnly) {
    return groups;
  }
  return groups.flatMap((group): SheetFeatGroup[] => {
    const feats = group.feats.filter((feat) => feat.category !== DisplayCategory.GrantOnly);
    return feats.length === 0 ? [] : [{ category: group.category, feats }];
  });
}
