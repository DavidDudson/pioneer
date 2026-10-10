import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { DamageTypeSchema } from './damage';
import { DamageFormula } from './damage-formula';
import { exceededBound, JsonBound, JsonSize } from './json-bounds';
import type { JsonBounds } from './json-bounds';
import { RulesMessage } from './messages';
import { RollOption } from './roll-option';
import { Selector } from './selector';
import { Dc, Feet } from './units';

const TEXT_LENGTH_MAX = 4000;
const LABEL_LENGTH_MAX = 200;

/** Deepest JSON nesting a rich text document may have; enough for lists nested five deep. */
export const RICH_TEXT_DEPTH_MAX = 24;
/** Most arrays and objects one document may hold, so imported or pasted text can't swamp the renderer. */
export const RICH_TEXT_CONTAINERS_MAX = 5000;

const RICH_TEXT_BOUNDS: JsonBounds = {
  depth: JsonSize.parse(RICH_TEXT_DEPTH_MAX),
  containers: JsonSize.parse(RICH_TEXT_CONTAINERS_MAX),
};

/** A run of content text: rules prose for official content, the author's words for homebrew. Never markup. */
export const RichTextString = z.string().min(1).max(TEXT_LENGTH_MAX).brand<'RichTextString'>();
export type RichTextString = z.infer<typeof RichTextString>;

/** Text shown in place of what an inline node would generate (`@UUID[...]{Label}` in Foundry). */
export const InlineLabel = z.string().min(1).max(LABEL_LENGTH_MAX).brand<'InlineLabel'>();
export type InlineLabel = z.infer<typeof InlineLabel>;

/** How a run of text is set off: emphasis (italic) or strong importance (bold). */
export const TextMark = { Emphasis: 'emphasis', Strong: 'strong' } as const;
export type TextMark = ValueOf<typeof TextMark>;
export const TextMarkSchema = z.enum(TextMark);

/** The action glyphs rules text uses: `[one-action]` to `[three-actions]`, `[free-action]`, `[reaction]`. */
export const ActionCost = { One: 'one', Two: 'two', Three: 'three', Free: 'free', Reaction: 'reaction' } as const;
export type ActionCost = ValueOf<typeof ActionCost>;
export const ActionCostSchema = z.enum(ActionCost);

/** Area shapes a spell or effect template can have. */
export const AreaShape = {
  Burst: 'burst',
  Cone: 'cone',
  Cube: 'cube',
  Cylinder: 'cylinder',
  Emanation: 'emanation',
  Line: 'line',
} as const;
export type AreaShape = ValueOf<typeof AreaShape>;
export const AreaShapeSchema = z.enum(AreaShape);

export const DurationUnit = { Round: 'round', Minute: 'minute', Hour: 'hour', Day: 'day' } as const;
export type DurationUnit = ValueOf<typeof DurationUnit>;
export const DurationUnitSchema = z.enum(DurationUnit);

/** How many rounds, minutes, hours or days a duration lasts. */
export const DurationCount = Pg.smallint().positive().brand<'DurationCount'>();
export type DurationCount = z.infer<typeof DurationCount>;

/** Every kind of inline node. */
export const InlineKind = {
  Text: 'text',
  LineBreak: 'line-break',
  Ref: 'ref',
  Check: 'check',
  Damage: 'damage',
  Template: 'template',
  Duration: 'duration',
  ActionCost: 'action-cost',
} as const;
export type InlineKind = ValueOf<typeof InlineKind>;

/** Every kind of block node. */
export const BlockKind = {
  Paragraph: 'paragraph',
  Heading: 'heading',
  List: 'list',
  Table: 'table',
  Rule: 'rule',
} as const;
export type BlockKind = ValueOf<typeof BlockKind>;

/** Outline levels inside a description, below the entry's own heading. */
export const RichTextHeadingLevel = { One: 1, Two: 2, Three: 3 } as const;
export type RichTextHeadingLevel = ValueOf<typeof RichTextHeadingLevel>;

const textMarks = z.array(TextMarkSchema).max(Object.keys(TextMark).length).readonly();

const TextNode = z.strictObject({
  type: z.literal(InlineKind.Text),
  text: RichTextString,
  marks: textMarks.optional(),
});
export type TextNode = z.infer<typeof TextNode>;

/** A line break inside a run, where the division is content (a stat line, a table cell); paragraphs split blocks. */
const LineBreakNode = z.strictObject({ type: z.literal(InlineKind.LineBreak) });
export type LineBreakNode = z.infer<typeof LineBreakNode>;

/** A live link to another entry ("Off-Guard", "Seek"); its name comes from the entry unless `label` is given. */
const RefNode = z.strictObject({ type: z.literal(InlineKind.Ref), id: ContentId, label: InlineLabel.optional() });
export type RefNode = z.infer<typeof RefNode>;

/** The DC of a check: a number, or another statistic's DC (`against: class-dc`, "against your class DC"). */
export const CheckDc = z.union([Dc, z.strictObject({ against: Selector })]);
export type CheckDc = z.infer<typeof CheckDc>;

/** Basic outcomes only exist for saving throws, whose selectors start `save:`. */
const SAVE_PREFIX = 'save:';

/** A check the text asks for ("DC 20 Athletics", "basic Reflex save"), rollable once dice arrive. */
const CheckNode = z
  .strictObject({
    type: z.literal(InlineKind.Check),
    statistic: Selector,
    dc: CheckDc.optional(),
    basic: z.boolean().optional(),
    options: z.array(RollOption).readonly().optional(),
    label: InlineLabel.optional(),
  })
  .refine((check) => check.basic !== true || check.statistic.startsWith(SAVE_PREFIX), {
    ...issueParams(message(RulesMessage.RichTextBasicSave)),
    path: ['basic'],
  });
export type CheckNode = z.infer<typeof CheckNode>;

/** Damage that lingers (persistent) or spatters adjacent creatures (splash). */
export const DamageCategory = { Persistent: 'persistent', Splash: 'splash' } as const;
export type DamageCategory = ValueOf<typeof DamageCategory>;
export const DamageCategorySchema = z.enum(DamageCategory);

/** One part of a damage roll: its dice and formula, type and category ("1d6 persistent fire"). */
export const DamageInstance = z.strictObject({
  formula: DamageFormula,
  damageType: DamageTypeSchema.optional(),
  category: DamageCategorySchema.optional(),
});
export type DamageInstance = z.infer<typeof DamageInstance>;

/** Most parts one damage roll has (`2d6 fire plus 1d6 persistent fire`). */
const DAMAGE_INSTANCES_MAX = 8;

/**
 * Damage the text deals ("2d6 fire plus 1d6 persistent fire"), or with `healing`, hit points it restores ("2d8
 * healing"). Rollable once dice arrive.
 */
const DamageNode = z.strictObject({
  type: z.literal(InlineKind.Damage),
  instances: z.array(DamageInstance).min(1).max(DAMAGE_INSTANCES_MAX).readonly(),
  healing: z.boolean().optional(),
  label: InlineLabel.optional(),
});
export type DamageNode = z.infer<typeof DamageNode>;

/** An area ("20-foot burst"); a line wider than 5 feet also has a `width` ("60-foot line, 10 feet wide"). */
const TemplateNode = z
  .strictObject({
    type: z.literal(InlineKind.Template),
    shape: AreaShapeSchema,
    size: Feet,
    width: Feet.optional(),
  })
  .refine((template) => template.width === undefined || template.shape === AreaShape.Line, {
    ...issueParams(message(RulesMessage.RichTextWidthOnLine)),
    path: ['width'],
  });
export type TemplateNode = z.infer<typeof TemplateNode>;

/** A span of time ("1 minute", "3 rounds"). */
const DurationNode = z.strictObject({
  type: z.literal(InlineKind.Duration),
  count: DurationCount,
  unit: DurationUnitSchema,
});
export type DurationNode = z.infer<typeof DurationNode>;

/** An action glyph inside text ("Stride [one-action]"). */
const ActionCostNode = z.strictObject({ type: z.literal(InlineKind.ActionCost), cost: ActionCostSchema });
export type ActionCostNode = z.infer<typeof ActionCostNode>;

export type InlineNode =
  | TextNode
  | LineBreakNode
  | RefNode
  | CheckNode
  | DamageNode
  | TemplateNode
  | DurationNode
  | ActionCostNode;

const Inline: z.ZodType<InlineNode> = z.discriminatedUnion('type', [
  TextNode,
  LineBreakNode,
  RefNode,
  CheckNode,
  DamageNode,
  TemplateNode,
  DurationNode,
  ActionCostNode,
]);

/** A run of inline nodes: a paragraph's content or one table cell. */
export type InlineContent = readonly InlineNode[];

export interface ParagraphNode {
  readonly type: typeof BlockKind.Paragraph;
  readonly content: InlineContent;
}

export interface HeadingNode {
  readonly type: typeof BlockKind.Heading;
  readonly level: RichTextHeadingLevel;
  readonly content: InlineContent;
}

/** Each item is its own run of blocks, so an item can hold paragraphs and nested lists. */
export interface ListNode {
  readonly type: typeof BlockKind.List;
  readonly ordered: boolean;
  readonly items: readonly (readonly BlockNode[])[];
}

/** A grid of inline cells; `header` is the optional first row of column headings, `caption` names the table. */
export interface TableNode {
  readonly type: typeof BlockKind.Table;
  readonly caption?: InlineLabel | undefined;
  readonly header?: readonly InlineContent[] | undefined;
  readonly rows: readonly (readonly InlineContent[])[];
}

/** A thematic break, as Foundry puts before a spell's heightened entries. */
export interface RuleNode {
  readonly type: typeof BlockKind.Rule;
}

export type BlockNode = ParagraphNode | HeadingNode | ListNode | TableNode | RuleNode;

/** A whole description: blocks in reading order. */
export type RichText = readonly BlockNode[];

const content = z.array(Inline).min(1).readonly();
const cell = z.array(Inline).readonly();
const cells = z.array(cell).min(1).readonly();
const rows = z.array(cells).min(1).readonly();
const headingLevel = z.literal(Object.values(RichTextHeadingLevel));

/**
 * One block, unguarded. Private: `RichText` runs the bounds check first, because this recursion has no limit of
 * its own.
 */
const Block: z.ZodType<BlockNode> = z.lazy(() => {
  const item = z.array(Block).min(1).readonly();
  return z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal(BlockKind.Paragraph), content }),
    z.strictObject({
      type: z.literal(BlockKind.Heading),
      level: headingLevel,
      content,
    }),
    z.strictObject({
      type: z.literal(BlockKind.List),
      ordered: z.boolean(),
      items: z.array(item).min(1).readonly(),
    }),
    z.strictObject({
      type: z.literal(BlockKind.Table),
      caption: InlineLabel.optional(),
      header: cells.optional(),
      rows,
    }),
    z.strictObject({ type: z.literal(BlockKind.Rule) }),
  ]);
});

const BOUND_MESSAGES = {
  [JsonBound.Depth]: message(RulesMessage.RichTextTooDeep, { maximum: RICH_TEXT_DEPTH_MAX }),
  [JsonBound.Containers]: message(RulesMessage.RichTextTooLarge, { maximum: RICH_TEXT_CONTAINERS_MAX }),
} as const;

/**
 * Content text as a small, safe document (content-model.md, "Rich text"): paragraphs, headings, lists, tables
 * and thematic breaks, with inline nodes that keep their meaning (links to entries, checks, damage, areas, durations,
 * action glyphs). Never HTML. Input past the bounds is rejected before the schema walks it.
 */
export const RichText: z.ZodType<RichText> = z
  .unknown()
  .check((context) => {
    const exceeded = exceededBound(context.value, RICH_TEXT_BOUNDS);
    if (exceeded !== undefined) {
      const { params } = issueParams(BOUND_MESSAGES[exceeded]);
      context.issues.push({ code: 'custom', input: context.value, params, abort: true });
    }
  })
  .pipe(z.array(Block).readonly());
