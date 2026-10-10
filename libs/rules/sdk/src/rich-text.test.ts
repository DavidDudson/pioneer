import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { contentId, PackId, Slug } from './content-id';
import { DamageFormula } from './damage-formula';
import { RulesMessage } from './messages';
import { RICH_TEXT_CONTAINERS_MAX, RICH_TEXT_DEPTH_MAX, RichText } from './rich-text';

function issues(schema: z.ZodType, value: unknown): readonly FieldIssue[] {
  const result = schema.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const offGuard = contentId(PackId.parse('player-core'), Slug.parse('off-guard'));

const paragraph = (text: string): unknown => ({ type: 'paragraph', content: [{ type: 'text', text }] });

/** A list holding a list holding ... `depth` lists deep. */
function nestedList(depth: number): unknown {
  let block = paragraph('Innermost');
  for (let level = 0; level < depth; level += 1) {
    block = { type: 'list', ordered: false, items: [[block]] };
  }
  return block;
}

const nestedLists = (depth: number): unknown => [nestedList(depth)];

describe('RichText', () => {
  test('accepts every block and inline node', () => {
    const document = [
      { type: 'heading', level: 2, content: [{ type: 'text', text: 'Fireball' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'action-cost', cost: 'two' },
          { type: 'text', text: ' A roaring blast of fire deals ', marks: ['strong'] },
          { type: 'damage', instances: [{ formula: '6d6', damageType: 'fire' }] },
          { type: 'line-break' },
          {
            type: 'damage',
            instances: [
              { formula: '(@item.level)d6', damageType: 'fire' },
              { formula: '1d6', damageType: 'fire', category: 'persistent' },
            ],
          },
          { type: 'damage', instances: [{ formula: '2d8' }], healing: true },
          { type: 'template', shape: 'line', size: 60, width: 10 },
          { type: 'check', statistic: 'save:will', dc: { against: 'class-dc' } },
          { type: 'text', text: ' in a ' },
          { type: 'template', shape: 'burst', size: 20 },
          { type: 'text', text: ', ' },
          { type: 'check', statistic: 'save:reflex', basic: true, options: ['item:trait:fire'] },
          { type: 'text', text: 'Targets are ' },
          { type: 'ref', id: offGuard, label: 'off-guard' },
          { type: 'text', text: ' for ' },
          { type: 'duration', count: 1, unit: 'round' },
        ],
      },
      { type: 'rule' },
      {
        type: 'list',
        ordered: true,
        items: [[paragraph('Critical Success No damage.')], [paragraph('Success Half damage.'), nestedList(1)]],
      },
      {
        type: 'table',
        header: [[{ type: 'text', text: 'Rank' }], [{ type: 'text', text: 'Damage' }]],
        rows: [[[{ type: 'text', text: '4th' }], []]],
      },
    ];
    expect(RichText.safeParse(document).success).toBe(true);
  });

  test('accepts an empty document', () => {
    expect(RichText.safeParse([]).success).toBe(true);
  });

  test('rejects raw HTML as a node, at its type', () => {
    expect(issues(RichText, [{ type: 'html', html: '<script>alert(1)</script>' }])).toStrictEqual([
      { path: [0, 'type'], message: message(ValidationMessage.InvalidValue) },
    ]);
  });

  test('rejects an unknown inline node and an extra field', () => {
    expect(issues(RichText, [{ type: 'paragraph', content: [{ type: 'image', src: 'x' }] }])).toStrictEqual([
      { path: [0, 'content', 0, 'type'], message: message(ValidationMessage.InvalidValue) },
    ]);
    expect(
      issues(RichText, [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi', html: '<b>Hi</b>' }] }]),
    ).toHaveLength(1);
  });

  test('rejects a paragraph with no content and a list with no items', () => {
    expect(RichText.safeParse([{ type: 'paragraph', content: [] }]).success).toBe(false);
    expect(RichText.safeParse([{ type: 'list', ordered: false, items: [] }]).success).toBe(false);
  });

  test('accepts lists nested to the depth limit and rejects one level more, with a localised message', () => {
    // The document array is one level, each list three (list, items, item), the paragraph and its text three.
    const fits = Math.floor((RICH_TEXT_DEPTH_MAX - 4) / 3);

    expect(RichText.safeParse(nestedLists(fits)).success).toBe(true);
    expect(issues(RichText, nestedLists(fits + 1))).toStrictEqual([
      { path: [], message: message(RulesMessage.RichTextTooDeep, { maximum: RICH_TEXT_DEPTH_MAX }) },
    ]);
  });

  test('accepts a document at the size limit and rejects one node more, with a localised message', () => {
    // The document array is one container and each paragraph three; rules (one each) make up the rest exactly.
    const paragraphs = Math.floor((RICH_TEXT_CONTAINERS_MAX - 1) / 3);
    const rules = RICH_TEXT_CONTAINERS_MAX - 1 - paragraphs * 3;
    const atLimit = [
      ...Array.from({ length: paragraphs }, () => paragraph('Again.')),
      ...Array.from({ length: rules }, () => ({ type: 'rule' })),
    ];

    expect(RichText.safeParse(atLimit).success).toBe(true);
    expect(issues(RichText, [...atLimit, { type: 'rule' }])).toStrictEqual([
      { path: [], message: message(RulesMessage.RichTextTooLarge, { maximum: RICH_TEXT_CONTAINERS_MAX }) },
    ]);
  });
});

describe('DamageFormula', () => {
  test.each(['2d6', '1d8 + @attr.str', '(1d6 + 2) * 2', '(@item.level)d6', '(floor(@level / 2))d4', '4', '@level'])(
    'accepts %s',
    (value) => {
      expect(DamageFormula.safeParse(value).success).toBe(true);
    },
  );

  test('points at an unknown reference after dice at its own position', () => {
    const [issue] = issues(DamageFormula, '2d6 + @nope');

    expect(issue?.message.key).toBe(RulesMessage.UnknownReference);
    expect(issue?.message.params).toMatchObject({ found: '@nope', position: 7 });
  });

  test.each(['', '2d6 +', 'd6'])('rejects %p', (value) => {
    expect(DamageFormula.safeParse(value).success).toBe(false);
  });
});

const inline = (node: unknown): unknown => [{ type: 'paragraph', content: [node] }];

describe('RichText inline rules', () => {
  test('only a saving throw can be basic', () => {
    expect(issues(RichText, inline({ type: 'check', statistic: 'skill:athletics', basic: true }))).toStrictEqual([
      { path: [0, 'content', 0, 'basic'], message: message(RulesMessage.RichTextBasicSave) },
    ]);
  });

  test('only a line has a width', () => {
    expect(issues(RichText, inline({ type: 'template', shape: 'burst', size: 20, width: 10 }))).toStrictEqual([
      { path: [0, 'content', 0, 'width'], message: message(RulesMessage.RichTextWidthOnLine) },
    ]);
  });

  test('damage needs at least one instance', () => {
    expect(RichText.safeParse(inline({ type: 'damage', instances: [] })).success).toBe(false);
  });
});
