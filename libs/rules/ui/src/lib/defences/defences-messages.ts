import { DefenceStatusKind } from '@pioneer/rules/engine';
import { DamageContext, DamageGroup } from '@pioneer/rules/sdk';

/** Message keys the defences panel renders with, spelled out so the key check sees them. */
export const DefencesMessage = {
  Immunities: 'rules.defences.immunities',
  Weaknesses: 'rules.defences.weaknesses',
  Resistances: 'rules.defences.resistances',
  NoImmunities: 'rules.defences.noImmunities',
  NoWeaknesses: 'rules.defences.noWeaknesses',
  NoResistances: 'rules.defences.noResistances',
  /** "Immunity fire". */
  Immunity: 'rules.defences.immunity',
  /** "Weakness 5 cold, except magical": value, target, then any exceptions. */
  Weakness: 'rules.defences.weakness',
  Resistance: 'rules.defences.resistance',
  /** "physical (bleed, bludgeoning, piercing, slashing)": a group and the types it covers. */
  GroupTypes: 'rules.defences.groupTypes',
  /** "from Plant Form": the badge on a line a battle form gives. */
  FromForm: 'rules.defences.fromForm',
  AppliesWhen: 'rules.defences.appliesWhen',
  /** A failed line that was conditional: the error, then that it applies only in some situations. */
  FailedConditional: 'rules.defences.failedConditional',
  SupersededBy: 'rules.defences.supersededBy',
} as const;

export const DAMAGE_GROUP_MESSAGES: Readonly<Record<DamageGroup, string>> = {
  [DamageGroup.All]: 'rules.defences.group.all',
  [DamageGroup.Physical]: 'rules.defences.group.physical',
  [DamageGroup.Energy]: 'rules.defences.group.energy',
};

/** Where damage came from, as a weakness or resistance names it. */
export const DAMAGE_CONTEXT_MESSAGES: Readonly<Record<DamageContext, string>> = {
  [DamageContext.AreaDamage]: 'rules.defences.context.areaDamage',
  [DamageContext.SplashDamage]: 'rules.defences.context.splashDamage',
  [DamageContext.Spells]: 'rules.defences.context.spells',
};

/** The status a line that does not simply apply is marked with. */
export type MarkedStatus = Exclude<DefenceStatusKind, typeof DefenceStatusKind.Applied>;

export const DEFENCE_STATUS_MESSAGES: Readonly<Record<MarkedStatus, string>> = {
  [DefenceStatusKind.Conditional]: 'rules.defences.status.conditional',
  [DefenceStatusKind.Superseded]: 'rules.defences.status.superseded',
  [DefenceStatusKind.Failed]: 'rules.defences.status.failed',
};

export const DEFENCE_STATUS_TONES = {
  [DefenceStatusKind.Conditional]: 'warning',
  [DefenceStatusKind.Superseded]: 'neutral',
  [DefenceStatusKind.Failed]: 'danger',
} as const satisfies Readonly<Record<MarkedStatus, string>>;
