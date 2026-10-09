import {
  array,
  boolean,
  constant,
  constantFrom,
  integer,
  letrec,
  oneof,
  record,
  string,
  tuple,
  uuid,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { DamageType } from '../damage';
import {
  ActionCost,
  AreaShape,
  BlockKind,
  DurationUnit,
  InlineKind,
  RichTextHeadingLevel,
  TextMark,
} from '../rich-text';
import { keyPathText, rollOptionText } from './arbitraries';

const BLOCK_DEPTH_MAX = 3;
const RUN_LENGTH_MAX = 4;
const BLOCKS_MAX = 4;
const CELLS_MAX = 3;
const ROWS_MAX = 3;
const TEXT_LENGTH_MAX = 40;
const SIZE_MAX = 120;
const DC_MAX = 50;
const COUNT_MAX = 60;
const DICE_MAX = 12;
const DIE_SIZE_MIN = 2;
const DIE_SIZE_MAX = 12;

/**
 * Text as an author might type it, markup included: rich text treats every character as text, so `<b>` must come
 * out as the four characters it is.
 */
const text: Arbitrary<string> = oneof(
  string({ minLength: 1, maxLength: TEXT_LENGTH_MAX }),
  constantFrom('<script>alert(1)</script>', '<b>bold</b>', '&amp;', '{{ danger }}'),
);

const label = string({ minLength: 1, maxLength: TEXT_LENGTH_MAX });

const damageFormula: Arbitrary<string> = tuple(
  integer({ min: 1, max: DICE_MAX }),
  integer({ min: DIE_SIZE_MIN, max: DIE_SIZE_MAX }),
  constantFrom('', ' + @attr.str', ' + @level'),
).map(([count, size, rest]) => `${count}d${size}${rest}`);

const marks = constantFrom(...Object.values(TextMark));
const damageTypes = constantFrom(...Object.values(DamageType));
const areaShapes = constantFrom(...Object.values(AreaShape));
const durationUnits = constantFrom(...Object.values(DurationUnit));
const actionCosts = constantFrom(...Object.values(ActionCost));
const headingLevels = constantFrom(...Object.values(RichTextHeadingLevel));
const contentIds = uuid({ version: 5 });
const checkOptions = array(rollOptionText, { maxLength: 2 });

/** Every inline node kind, as plain JSON (unparsed). */
export const inlineNodeJson: Arbitrary<unknown> = oneof(
  record(
    { type: constant(InlineKind.Text), text, marks: array(marks, { maxLength: 2 }) },
    { requiredKeys: ['type', 'text'] },
  ),
  record({ type: constant(InlineKind.Ref), id: contentIds, label }, { requiredKeys: ['type', 'id'] }),
  record(
    {
      type: constant(InlineKind.Check),
      statistic: keyPathText,
      dc: integer({ min: 0, max: DC_MAX }),
      basic: boolean(),
      options: checkOptions,
      label,
    },
    { requiredKeys: ['type', 'statistic'] },
  ),
  record(
    {
      type: constant(InlineKind.Damage),
      formula: damageFormula,
      damageType: damageTypes,
      label,
    },
    { requiredKeys: ['type', 'formula'] },
  ),
  record({
    type: constant(InlineKind.Template),
    shape: areaShapes,
    size: integer({ min: 0, max: SIZE_MAX }),
  }),
  record({
    type: constant(InlineKind.Duration),
    count: integer({ min: 1, max: COUNT_MAX }),
    unit: durationUnits,
  }),
  record({ type: constant(InlineKind.ActionCost), cost: actionCosts }),
);

const run = array(inlineNodeJson, { minLength: 1, maxLength: RUN_LENGTH_MAX });
const cells = array(array(inlineNodeJson, { maxLength: 2 }), { minLength: 1, maxLength: CELLS_MAX });

/** Every block node kind, lists nesting a few levels, as plain JSON (unparsed). */
export const blockNodeJson: Arbitrary<unknown> = letrec<{ block: unknown }>((tie) => {
  const blocks = array(tie('block'), { minLength: 1, maxLength: BLOCKS_MAX });
  return {
    block: oneof(
      { depthSize: 'small', maxDepth: BLOCK_DEPTH_MAX, withCrossShrink: true },
      record({ type: constant(BlockKind.Paragraph), content: run }),
      record({ type: constant(BlockKind.Rule) }),
      record({
        type: constant(BlockKind.Heading),
        level: headingLevels,
        content: run,
      }),
      record(
        {
          type: constant(BlockKind.Table),
          caption: label,
          header: cells,
          rows: array(cells, { minLength: 1, maxLength: ROWS_MAX }),
        },
        { requiredKeys: ['type', 'rows'] },
      ),
      record({
        type: constant(BlockKind.List),
        ordered: boolean(),
        items: array(blocks, { minLength: 1, maxLength: BLOCKS_MAX }),
      }),
    ),
  };
}).block;

/** A valid rich text document, as plain JSON. */
export const richTextJson: Arbitrary<unknown> = array(blockNodeJson, { maxLength: BLOCKS_MAX });
