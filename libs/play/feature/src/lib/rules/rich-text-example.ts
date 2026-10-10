import { contentId, PackId, Slug } from '@pioneer/rules/sdk';

const OFF_GUARD = contentId(PackId.parse('player-core'), Slug.parse('off-guard'));

/** Feet across the example's burst. */
const EXAMPLE_BURST = 20;
/** The example save's DC. */
const EXAMPLE_DC = 18;

/** A spell-like description using every kind of node. */
export const EXAMPLE_RICH_TEXT = [
  {
    type: 'paragraph',
    content: [
      { type: 'action-cost', cost: 'two' },
      { type: 'text', text: ' A burst of flame fills a ' },
      { type: 'template', shape: 'burst', size: EXAMPLE_BURST },
      { type: 'text', text: ', dealing ' },
      { type: 'damage', instances: [{ formula: '6d6', damageType: 'fire' }] },
      { type: 'text', text: ' with a ' },
      { type: 'check', statistic: 'save:reflex', dc: EXAMPLE_DC, basic: true },
      { type: 'text', text: '.' },
    ],
  },
  {
    type: 'list',
    ordered: false,
    items: [
      [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Critical Failure', marks: ['strong'] },
            { type: 'text', text: ' The creature is also ' },
            { type: 'ref', id: OFF_GUARD, label: 'off-guard' },
            { type: 'text', text: ' for ' },
            { type: 'duration', count: 1, unit: 'round' },
            { type: 'text', text: '.' },
          ],
        },
      ],
    ],
  },
  { type: 'rule' },
  { type: 'heading', level: 1, content: [{ type: 'text', text: 'Heightened (+1)' }] },
  {
    type: 'table',
    header: [[{ type: 'text', text: 'Rank' }], [{ type: 'text', text: 'Damage' }]],
    rows: [
      [[{ type: 'text', text: '4th' }], [{ type: 'damage', instances: [{ formula: '8d6', damageType: 'fire' }] }]],
    ],
  },
];
