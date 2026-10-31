import type { ContentLookup, GrantResolution } from '@pioneer/rules/grants';
import {
  CommonFacet,
  ContentKind,
  FacetValue,
  Level,
  PREREQUISITES_MET_FACET,
  PrerequisiteValue,
  RangeBound,
  Rarity,
  RuleElementKey,
  SelectionKind,
  SlotRank,
  SpellFacet,
} from '@pioneer/rules/sdk';
import type {
  ChoiceQuery,
  FacetId,
  FacetSelection,
  FilterState,
  PredicateStatement,
  PrerequisiteStatusOf,
  SlotKey,
} from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { prerequisiteReads, withoutPick } from './feat-slots';
import type { PreparedSlot } from './prepared-spells';
import { PrerequisiteStatus, prerequisiteStatus } from './prerequisite-status';
import { skillReads } from './slot-reads';
import type { SlotContent } from './slot-reads';

/** The roll option a query's filter reads a candidate's trait under: `item:trait:fighter`. */
const TRAIT_OPTION = 'item:trait:';
/** The trait of items too powerful to offer a character: never in an "available to you" list. */
const ARTIFACT_TRAIT = FacetValue.parse('artifact');

/**
 * The traits a query's filter requires of every candidate: its `item:trait:*` options, at the top level or under
 * `and`. A facet picks any of its values, so a filter asking for two traits at once reads as either (broader, never
 * narrower, than the slot offers).
 */
function filterTraits(statements: readonly PredicateStatement[]): readonly FacetValue[] {
  return statements.flatMap((statement): readonly FacetValue[] => {
    if (typeof statement === 'string') {
      return statement.startsWith(TRAIT_OPTION) ? [FacetValue.parse(statement.slice(TRAIT_OPTION.length))] : [];
    }
    return 'and' in statement ? filterTraits(statement.and) : [];
  });
}

/** Each value once, in order. */
const distinct = (found: readonly FacetValue[]): readonly FacetValue[] => [...new Set(found)].toSorted();

/** The `ChoiceSet` query behind `slot` in the grants at its level, if it is one that queries content. */
function slotQuery(grants: GrantResolution, lookup: ContentLookup, slot: SlotKey): ChoiceQuery | undefined {
  const found = [...grants.open, ...grants.answered].find(({ key }) => key === slot);
  const element = found === undefined ? undefined : lookup.entry(found.origin.entry)?.rules[found.rule];
  return element?.key === RuleElementKey.ChoiceSet && !Array.isArray(element.choices) ? element.choices : undefined;
}

/**
 * The "available to you" preset (#285) for a content slot, as a filter state any picker of that kind can show and
 * the player can loosen: entries up to the slot's level (a feat slot's own, else the character's); carrying the
 * traits the slot asks for, which include the character's class or ancestry when the slot asks for its own trait;
 * never unique or artifact; and, for feats, with prerequisites not unmet (unknown stays, so a feat the importer
 * couldn't parse is still found). Pairs with `slotPrerequisiteStatus` for the prerequisites facet. A slot that
 * queries no content gets the level cap and the exclusions alone.
 */
export function availableToYou(document: CharacterDocument, content: SlotContent, slot: SlotKey): FilterState {
  const reads = prerequisiteReads(withoutPick(document, slot), content);
  const level = reads.featSlotLevels.get(slot) ?? Level.parse(document.level);
  const query = slotQuery(skillReads(document, content).grantsAt(level), content.lookup, slot);
  const own = query?.ownTrait === undefined ? [] : reads.factsAt(level).tails(query.ownTrait);
  const traits = [...filterTraits(query?.filter ?? []), ...own.map((trait) => FacetValue.parse(trait))];
  const selections: [FacetId, FacetSelection][] = [
    [CommonFacet.Level, { kind: SelectionKind.Range, min: undefined, max: RangeBound.parse(level) }],
    [CommonFacet.Rarity, { kind: SelectionKind.Values, include: [], exclude: [FacetValue.parse(Rarity.Unique)] }],
    [CommonFacet.Traits, { kind: SelectionKind.Values, include: distinct(traits), exclude: [ARTIFACT_TRAIT] }],
  ];
  if (query?.kind === ContentKind.Feat) {
    const unmet = FacetValue.parse(PrerequisiteValue.Unmet);
    selections.push([PREREQUISITES_MET_FACET, { kind: SelectionKind.Values, include: [], exclude: [unmet] }]);
  }
  return new Map(selections);
}

/**
 * How the character's prerequisites read for any feat, as `slot` reads them: at the level it opens, with the slot
 * itself empty. Feeds `prerequisitesMetFacet`. A feat the content doesn't hold reads as unknown.
 */
export function slotPrerequisiteStatus(
  document: CharacterDocument,
  content: SlotContent,
  slot: SlotKey,
): PrerequisiteStatusOf {
  const reads = prerequisiteReads(withoutPick(document, slot), content);
  const facts = reads.factsAt(reads.featSlotLevels.get(slot) ?? Level.parse(document.level));
  return (entry) => {
    const feat = reads.feats.feat(entry.id);
    return feat === undefined ? PrerequisiteStatus.Unknown : prerequisiteStatus(feat, facts);
  };
}

/** The slot facts a spell preset reads. */
export type SpellSlotPlace = Pick<PreparedSlot, 'rank' | 'tradition' | 'pool' | 'deitySpell'>;

/**
 * The "available to you" preset (#286) for a spell slot: spells of the rank the slot holds or lower (a cantrip slot's
 * are cantrips), carrying the tradition of the entry that owns the slot, never unique or artifact. A pool's slot takes
 * the spells its pool names whatever their tradition, and a deity's spell is cast whatever its tradition, so neither
 * asks for the entry's. The slot's own offer already fits all this; the preset is what the filters start on, for the
 * player to loosen.
 */
export function availableSpellsToYou({ rank, tradition, pool, deitySpell }: SpellSlotPlace): FilterState {
  const cantrip = rank === SlotRank.Cantrip;
  const selections: [FacetId, FacetSelection][] = [
    [CommonFacet.Rarity, { kind: SelectionKind.Values, include: [], exclude: [FacetValue.parse(Rarity.Unique)] }],
    [
      CommonFacet.Traits,
      {
        kind: SelectionKind.Values,
        include: cantrip ? [FacetValue.parse('cantrip')] : [],
        exclude: [ARTIFACT_TRAIT],
      },
    ],
  ];
  if (!cantrip) {
    selections.push([SpellFacet.Rank, { kind: SelectionKind.Range, min: undefined, max: RangeBound.parse(rank) }]);
  }
  if (pool === undefined && !deitySpell) {
    selections.push([
      SpellFacet.Tradition,
      { kind: SelectionKind.Values, include: [FacetValue.parse(tradition)], exclude: [] },
    ]);
  }
  return new Map(selections);
}
