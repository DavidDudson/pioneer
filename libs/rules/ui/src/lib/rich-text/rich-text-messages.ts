import { ActionCost, AreaShape, DamageCategory, DamageType, DurationUnit } from '@pioneer/rules/sdk';

/** Message keys rich text renders with, spelled out so the key check sees them. */
export const RichTextMessage = {
  Check: 'rules.richText.check',
  Damage: 'rules.richText.damage',
  Healing: 'rules.richText.healing',
  Template: 'rules.richText.template',
  UnnamedEntry: 'rules.richText.unnamedEntry',
  UnnamedCheck: 'rules.richText.unnamedCheck',
  UnnamedSave: 'rules.richText.unnamedSave',
  UnnamedDc: 'rules.richText.unnamedDc',
  Table: 'rules.richText.table',
} as const;

export interface ActionCostMessages {
  /** What a screen reader says: "Two actions". */
  readonly label: string;
  /** What the page shows. */
  readonly glyph: string;
}

export const ACTION_COST_MESSAGES: Readonly<Record<ActionCost, ActionCostMessages>> = {
  [ActionCost.One]: { label: 'rules.richText.actionCost.one.label', glyph: 'rules.richText.actionCost.one.glyph' },
  [ActionCost.Two]: { label: 'rules.richText.actionCost.two.label', glyph: 'rules.richText.actionCost.two.glyph' },
  [ActionCost.Three]: {
    label: 'rules.richText.actionCost.three.label',
    glyph: 'rules.richText.actionCost.three.glyph',
  },
  [ActionCost.Free]: { label: 'rules.richText.actionCost.free.label', glyph: 'rules.richText.actionCost.free.glyph' },
  [ActionCost.Reaction]: {
    label: 'rules.richText.actionCost.reaction.label',
    glyph: 'rules.richText.actionCost.reaction.glyph',
  },
};

/** Damage types as rules text names them, in lower case ("2d6 fire"). */
export const DAMAGE_TYPE_MESSAGES: Readonly<Record<DamageType, string>> = {
  [DamageType.Bludgeoning]: 'rules.richText.damageType.bludgeoning',
  [DamageType.Piercing]: 'rules.richText.damageType.piercing',
  [DamageType.Slashing]: 'rules.richText.damageType.slashing',
  [DamageType.Acid]: 'rules.richText.damageType.acid',
  [DamageType.Cold]: 'rules.richText.damageType.cold',
  [DamageType.Electricity]: 'rules.richText.damageType.electricity',
  [DamageType.Fire]: 'rules.richText.damageType.fire',
  [DamageType.Sonic]: 'rules.richText.damageType.sonic',
  [DamageType.Vitality]: 'rules.richText.damageType.vitality',
  [DamageType.Void]: 'rules.richText.damageType.void',
  [DamageType.Force]: 'rules.richText.damageType.force',
  [DamageType.Spirit]: 'rules.richText.damageType.spirit',
  [DamageType.Mental]: 'rules.richText.damageType.mental',
  [DamageType.Poison]: 'rules.richText.damageType.poison',
  [DamageType.Bleed]: 'rules.richText.damageType.bleed',
  [DamageType.Precision]: 'rules.richText.damageType.precision',
};

export const DAMAGE_CATEGORY_MESSAGES: Readonly<Record<DamageCategory, string>> = {
  [DamageCategory.Persistent]: 'rules.richText.damageCategory.persistent',
  [DamageCategory.Splash]: 'rules.richText.damageCategory.splash',
};

export const AREA_SHAPE_MESSAGES: Readonly<Record<AreaShape, string>> = {
  [AreaShape.Burst]: 'rules.richText.areaShape.burst',
  [AreaShape.Cone]: 'rules.richText.areaShape.cone',
  [AreaShape.Cube]: 'rules.richText.areaShape.cube',
  [AreaShape.Cylinder]: 'rules.richText.areaShape.cylinder',
  [AreaShape.Emanation]: 'rules.richText.areaShape.emanation',
  [AreaShape.Line]: 'rules.richText.areaShape.line',
};

/** Each unit's message takes `count` and picks its own plural. */
export const DURATION_MESSAGES: Readonly<Record<DurationUnit, string>> = {
  [DurationUnit.Round]: 'rules.richText.duration.round',
  [DurationUnit.Minute]: 'rules.richText.duration.minute',
  [DurationUnit.Hour]: 'rules.richText.duration.hour',
  [DurationUnit.Day]: 'rules.richText.duration.day',
};
