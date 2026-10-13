import { SpellTimeUnit, TargetKind } from '@pioneer/rules/sdk';

/** Message keys the spell details render with, spelled out so the key check sees them. */
export const SpellListMessage = {
  CastAt: 'rules.spellList.castAt',
  None: 'rules.spellList.none',
  CostTo: 'rules.spellList.costTo',
  Or: 'rules.spellList.or',
  And: 'rules.spellList.and',
  Effect: 'rules.spellList.effectLabel',
  RangeFeet: 'rules.spellList.range.feet',
  RangeMiles: 'rules.spellList.range.miles',
  RangeTouch: 'rules.spellList.range.touch',
  RangePlanetary: 'rules.spellList.range.planetary',
  RangeInterplanar: 'rules.spellList.range.interplanar',
  RangeUnlimited: 'rules.spellList.range.unlimited',
  Area: 'rules.spellList.area',
  TargetAny: 'rules.spellList.targets.count.any',
  TargetAll: 'rules.spellList.targets.count.all',
  TargetNumber: 'rules.spellList.targets.count.number',
  TargetUpTo: 'rules.spellList.targets.count.upTo',
  TargetQualifier: 'rules.spellList.targets.qualifier',
  TargetTrait: 'rules.spellList.targets.trait',
  TargetWithin: 'rules.spellList.targets.within',
  TargetTriggering: 'rules.spellList.targets.triggering',
  TargetYou: 'rules.spellList.targets.you',
  DurationTime: 'rules.spellList.duration.time',
  DurationUpTo: 'rules.spellList.duration.upTo',
  DurationSustainedUpTo: 'rules.spellList.duration.sustainedUpTo',
  DurationRolled: 'rules.spellList.duration.rolled',
  DurationSustained: 'rules.spellList.duration.sustained',
  DurationUntil: 'rules.spellList.duration.until',
  DurationUnlimited: 'rules.spellList.duration.unlimited',
  DurationVaries: 'rules.spellList.duration.varies',
  DefenceSave: 'rules.spellList.defence.save',
  DefenceDc: 'rules.spellList.defence.dc',
  DefenceAc: 'rules.spellList.defence.ac',
  Counteract: 'rules.spellList.counteract',
  TagCantrip: 'rules.spellList.tag.cantrip',
  TagFocus: 'rules.spellList.tag.focus',
  TagSignature: 'rules.spellList.tag.signature',
  TagAttack: 'rules.spellList.tag.attack',
  EffectDamage: 'rules.spellList.effect.damage',
  EffectHealing: 'rules.spellList.effect.healing',
  EffectBoth: 'rules.spellList.effect.both',
} as const;

/** The column labels spell details share with the content facets. */
export const SpellFieldLabel = {
  Range: 'rules.facet.label.range',
  Area: 'rules.facet.label.area',
  Targets: 'rules.facet.label.targets',
  Defence: 'rules.facet.label.defense',
  Duration: 'rules.facet.label.duration',
} as const;

/** Each unit's message takes `count` and picks its own plural. */
export const SPELL_TIME_UNIT_MESSAGES: Readonly<Record<SpellTimeUnit, string>> = {
  [SpellTimeUnit.Round]: 'rules.spellList.unit.round',
  [SpellTimeUnit.Minute]: 'rules.spellList.unit.minute',
  [SpellTimeUnit.Hour]: 'rules.spellList.unit.hour',
  [SpellTimeUnit.Day]: 'rules.spellList.unit.day',
  [SpellTimeUnit.Week]: 'rules.spellList.unit.week',
  [SpellTimeUnit.Month]: 'rules.spellList.unit.month',
  [SpellTimeUnit.Year]: 'rules.spellList.unit.year',
};

/** Each kind's message takes `count` and picks its own plural. */
export const TARGET_KIND_MESSAGES: Readonly<Record<TargetKind, string>> = {
  [TargetKind.Creature]: 'rules.spellList.targets.kind.creature',
  [TargetKind.Object]: 'rules.spellList.targets.kind.object',
  [TargetKind.Ally]: 'rules.spellList.targets.kind.ally',
  [TargetKind.Enemy]: 'rules.spellList.targets.kind.enemy',
  [TargetKind.Corpse]: 'rules.spellList.targets.kind.corpse',
  [TargetKind.Weapon]: 'rules.spellList.targets.kind.weapon',
  [TargetKind.Item]: 'rules.spellList.targets.kind.item',
  [TargetKind.SpellEffect]: 'rules.spellList.targets.kind.spellEffect',
  [TargetKind.Companion]: 'rules.spellList.targets.kind.companion',
  [TargetKind.AnimalCompanion]: 'rules.spellList.targets.kind.animalCompanion',
  [TargetKind.Familiar]: 'rules.spellList.targets.kind.familiar',
  [TargetKind.Eidolon]: 'rules.spellList.targets.kind.eidolon',
};
