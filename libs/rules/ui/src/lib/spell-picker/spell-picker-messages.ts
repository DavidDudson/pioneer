import { AreaValue, DefenseValue, DurationValue, RangeBand, Rarity, TargetValue } from '@pioneer/rules/sdk';

/** Message keys the spell picker renders with, spelled out so the key check sees them. */
export const SpellPickerMessage = {
  Name: 'rules.spellPicker.column.name',
  Rank: 'rules.spellPicker.column.rank',
  Traditions: 'rules.spellPicker.column.traditions',
  Cast: 'rules.spellPicker.column.cast',
  Range: 'rules.spellPicker.column.range',
  AreaTargets: 'rules.spellPicker.column.areaTargets',
  Duration: 'rules.spellPicker.column.duration',
  Save: 'rules.spellPicker.column.save',
  Traits: 'rules.spellPicker.column.traits',
  Source: 'rules.spellPicker.column.source',
} as const;

/** What each rarity above common is called, shown as a chip before the traits. */
export const SPELL_RARITY_MESSAGES: Readonly<Record<Exclude<Rarity, typeof Rarity.Common>, string>> = {
  [Rarity.Uncommon]: 'rules.spellPicker.rarity.uncommon',
  [Rarity.Rare]: 'rules.spellPicker.rarity.rare',
  [Rarity.Unique]: 'rules.spellPicker.rarity.unique',
};

/** The content browser's words for how far a spell reaches. */
export const RANGE_MESSAGES: Readonly<Record<RangeBand, string>> = {
  [RangeBand.Touch]: 'rules.facet.range.touch',
  [RangeBand.UpTo30]: 'rules.facet.range.upTo30',
  [RangeBand.UpTo60]: 'rules.facet.range.upTo60',
  [RangeBand.UpTo120]: 'rules.facet.range.upTo120',
  [RangeBand.Long]: 'rules.facet.range.long',
  [RangeBand.Planetary]: 'rules.facet.range.planetary',
  [RangeBand.Interplanar]: 'rules.facet.range.interplanar',
  [RangeBand.Unlimited]: 'rules.facet.range.unlimited',
  [RangeBand.None]: 'rules.facet.range.none',
};

export const AREA_MESSAGES: Readonly<Record<AreaValue, string>> = {
  [AreaValue.Burst]: 'rules.facet.area.burst',
  [AreaValue.Cone]: 'rules.facet.area.cone',
  [AreaValue.Cube]: 'rules.facet.area.cube',
  [AreaValue.Cylinder]: 'rules.facet.area.cylinder',
  [AreaValue.Emanation]: 'rules.facet.area.emanation',
  [AreaValue.Line]: 'rules.facet.area.line',
  [AreaValue.Square]: 'rules.facet.area.square',
  [AreaValue.None]: 'rules.facet.area.none',
};

export const TARGET_MESSAGES: Readonly<Record<TargetValue, string>> = {
  [TargetValue.Single]: 'rules.facet.targets.single',
  [TargetValue.Multiple]: 'rules.facet.targets.multiple',
  [TargetValue.Allies]: 'rules.facet.targets.allies',
  [TargetValue.Self]: 'rules.facet.targets.self',
  [TargetValue.None]: 'rules.facet.targets.none',
};

export const DEFENSE_MESSAGES: Readonly<Record<DefenseValue, string>> = {
  [DefenseValue.Attack]: 'rules.facet.defense.attack',
  [DefenseValue.Fortitude]: 'rules.facet.defense.fortitude',
  [DefenseValue.Reflex]: 'rules.facet.defense.reflex',
  [DefenseValue.Will]: 'rules.facet.defense.will',
  [DefenseValue.None]: 'rules.facet.defense.none',
};

export const DURATION_MESSAGES: Readonly<Record<DurationValue, string>> = {
  [DurationValue.Instant]: 'rules.facet.duration.instant',
  [DurationValue.Round]: 'rules.facet.duration.round',
  [DurationValue.Minute]: 'rules.facet.duration.minute',
  [DurationValue.Hour]: 'rules.facet.duration.hour',
  [DurationValue.Day]: 'rules.facet.duration.day',
  [DurationValue.Long]: 'rules.facet.duration.long',
  [DurationValue.Until]: 'rules.facet.duration.until',
  [DurationValue.Sustained]: 'rules.facet.duration.sustained',
  [DurationValue.Unlimited]: 'rules.facet.duration.unlimited',
  [DurationValue.Varies]: 'rules.facet.duration.varies',
};
