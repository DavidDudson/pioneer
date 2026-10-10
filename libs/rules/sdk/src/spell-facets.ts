import { ContentKind } from './content-kind';
import { facetLabels, FacetId, FacetLabel, FacetType } from './facet';
import type { FacetDefinition, FacetDerive } from './facet';
import {
  AreaValue,
  CastActions,
  castActions,
  DefenseValue,
  defenseValues,
  DurationValue,
  durationValue,
  isSustained,
  RangeBand,
  rangeBand,
  TargetValue,
  targetValues,
} from './spell-facet-values';
import type { SpellEntry } from './spell-facet-values';
import { MagicTradition } from './spellcasting-tradition';

/** A facet that reads spells only: entries of other kinds give it no value. */
function ofSpells(read: (entry: SpellEntry) => readonly unknown[]): FacetDerive {
  return (entry): readonly unknown[] => (entry.kind === ContentKind.Spell ? read(entry) : []);
}

export const SpellFacetMessage = {
  Rank: FacetLabel.parse('rules.facet.label.rank'),
  Tradition: FacetLabel.parse('rules.facet.label.tradition'),
  CastActions: FacetLabel.parse('rules.facet.label.castActions'),
  RangeBand: FacetLabel.parse('rules.facet.label.range'),
  Area: FacetLabel.parse('rules.facet.label.area'),
  Targets: FacetLabel.parse('rules.facet.label.targets'),
  Defense: FacetLabel.parse('rules.facet.label.defense'),
  Duration: FacetLabel.parse('rules.facet.label.duration'),
  Sustained: FacetLabel.parse('rules.facet.label.sustained'),
  DamageType: FacetLabel.parse('rules.facet.label.damageType'),
  Heightens: FacetLabel.parse('rules.facet.label.heightens'),
} as const;

const TRADITION_LABELS = facetLabels({
  [MagicTradition.Arcane]: 'rules.facet.tradition.arcane',
  [MagicTradition.Divine]: 'rules.facet.tradition.divine',
  [MagicTradition.Occult]: 'rules.facet.tradition.occult',
  [MagicTradition.Primal]: 'rules.facet.tradition.primal',
});

const CAST_ACTION_LABELS = facetLabels({
  [CastActions.One]: 'rules.facet.castActions.one',
  [CastActions.Two]: 'rules.facet.castActions.two',
  [CastActions.Three]: 'rules.facet.castActions.three',
  [CastActions.Free]: 'rules.facet.castActions.free',
  [CastActions.Reaction]: 'rules.facet.castActions.reaction',
  [CastActions.Time]: 'rules.facet.castActions.time',
});

const RANGE_LABELS = facetLabels({
  [RangeBand.Touch]: 'rules.facet.range.touch',
  [RangeBand.UpTo30]: 'rules.facet.range.upTo30',
  [RangeBand.UpTo60]: 'rules.facet.range.upTo60',
  [RangeBand.UpTo120]: 'rules.facet.range.upTo120',
  [RangeBand.Long]: 'rules.facet.range.long',
  [RangeBand.Planetary]: 'rules.facet.range.planetary',
  [RangeBand.Unlimited]: 'rules.facet.range.unlimited',
  [RangeBand.None]: 'rules.facet.range.none',
});

const AREA_LABELS = facetLabels({
  [AreaValue.Burst]: 'rules.facet.area.burst',
  [AreaValue.Cone]: 'rules.facet.area.cone',
  [AreaValue.Cube]: 'rules.facet.area.cube',
  [AreaValue.Cylinder]: 'rules.facet.area.cylinder',
  [AreaValue.Emanation]: 'rules.facet.area.emanation',
  [AreaValue.Line]: 'rules.facet.area.line',
  [AreaValue.None]: 'rules.facet.area.none',
});

const TARGET_LABELS = facetLabels({
  [TargetValue.Single]: 'rules.facet.targets.single',
  [TargetValue.Multiple]: 'rules.facet.targets.multiple',
  [TargetValue.Allies]: 'rules.facet.targets.allies',
  [TargetValue.Self]: 'rules.facet.targets.self',
  [TargetValue.None]: 'rules.facet.targets.none',
});

const DEFENSE_LABELS = facetLabels({
  [DefenseValue.Attack]: 'rules.facet.defense.attack',
  [DefenseValue.Fortitude]: 'rules.facet.defense.fortitude',
  [DefenseValue.Reflex]: 'rules.facet.defense.reflex',
  [DefenseValue.Will]: 'rules.facet.defense.will',
  [DefenseValue.None]: 'rules.facet.defense.none',
});

const DURATION_LABELS = facetLabels({
  [DurationValue.Instant]: 'rules.facet.duration.instant',
  [DurationValue.Round]: 'rules.facet.duration.round',
  [DurationValue.Minute]: 'rules.facet.duration.minute',
  [DurationValue.Hour]: 'rules.facet.duration.hour',
  [DurationValue.Day]: 'rules.facet.duration.day',
  [DurationValue.Long]: 'rules.facet.duration.long',
  [DurationValue.Until]: 'rules.facet.duration.until',
  [DurationValue.Sustained]: 'rules.facet.duration.sustained',
  [DurationValue.Unlimited]: 'rules.facet.duration.unlimited',
});

/** The spell facets (content-model.md, "Filters"), beyond the common ones. */
export const SPELL_FACETS: readonly FacetDefinition[] = [
  {
    id: FacetId.parse('rank'),
    type: FacetType.Range,
    label: SpellFacetMessage.Rank,
    derive: ofSpells(({ data }) => [data.rank]),
  },
  {
    id: FacetId.parse('tradition'),
    type: FacetType.Set,
    label: SpellFacetMessage.Tradition,
    values: TRADITION_LABELS,
    derive: ofSpells(({ data }) => data.traditions),
  },
  {
    id: FacetId.parse('cast-actions'),
    type: FacetType.Set,
    label: SpellFacetMessage.CastActions,
    values: CAST_ACTION_LABELS,
    derive: ofSpells(({ data }) => castActions(data)),
  },
  {
    id: FacetId.parse('range'),
    type: FacetType.Set,
    label: SpellFacetMessage.RangeBand,
    values: RANGE_LABELS,
    derive: ofSpells(({ data }) => [rangeBand(data)]),
  },
  {
    id: FacetId.parse('area'),
    type: FacetType.Set,
    label: SpellFacetMessage.Area,
    values: AREA_LABELS,
    derive: ofSpells(({ data }) => [data.area?.shape ?? AreaValue.None]),
  },
  {
    id: FacetId.parse('targets'),
    type: FacetType.Set,
    label: SpellFacetMessage.Targets,
    values: TARGET_LABELS,
    derive: ofSpells(({ data }) => targetValues(data)),
  },
  {
    id: FacetId.parse('defense'),
    type: FacetType.Set,
    label: SpellFacetMessage.Defense,
    values: DEFENSE_LABELS,
    derive: ofSpells((entry) => defenseValues(entry)),
  },
  {
    id: FacetId.parse('duration'),
    type: FacetType.Set,
    label: SpellFacetMessage.Duration,
    values: DURATION_LABELS,
    derive: ofSpells(({ data }) => [durationValue(data)]),
  },
  {
    id: FacetId.parse('sustained'),
    type: FacetType.Flag,
    label: SpellFacetMessage.Sustained,
    derive: ofSpells(({ data }) => [isSustained(data)]),
  },
  {
    id: FacetId.parse('damage-type'),
    type: FacetType.Set,
    label: SpellFacetMessage.DamageType,
    derive: ofSpells(({ data }) => data.damage.map((part) => part.damageType)),
  },
  {
    id: FacetId.parse('heightens'),
    type: FacetType.Flag,
    label: SpellFacetMessage.Heightens,
    derive: ofSpells(({ data }) => [data.heightening !== undefined]),
  },
];
