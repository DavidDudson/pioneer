import { ActionCost } from '@pioneer/rules/sdk';

/** Message keys rich text renders with, spelled out so the key check sees them. */
export const RichTextMessage = {
  Check: 'rules.richText.check',
  Damage: 'rules.richText.damage',
  Template: 'rules.richText.template',
  Duration: 'rules.richText.duration',
  UnnamedEntry: 'rules.richText.unnamedEntry',
  Table: 'rules.richText.table',
} as const;

export interface ActionCostMessages {
  /** What a screen reader and a tooltip say: "Two actions". */
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
