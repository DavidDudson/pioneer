import { applicationConfig } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { HeadingLevel } from '@pioneer/frontier';
import { ContentText, contentId, PackId, RichText, Slug } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { provideRichTextLinks } from './rich-text-links';
import type { RichTextLinks } from './rich-text-links';
import { RichTextView } from './rich-text.component';

const OFF_GUARD = contentId(PackId.parse('player-core'), Slug.parse('off-guard'));
const STATISTIC_NAMES: ReadonlyMap<string, ContentText> = new Map([['save:reflex', ContentText.parse('Reflex')]]);

/** A page that can open Off-Guard and knows the Reflex save. */
const LINKS: RichTextLinks = {
  name: (id: ContentId): ContentText | undefined => (id === OFF_GUARD ? ContentText.parse('Off-Guard') : undefined),
  target: (id: ContentId): readonly string[] | undefined => (id === OFF_GUARD ? ['/content', 'off-guard'] : undefined),
  statisticName: (selector): ContentText | undefined => STATISTIC_NAMES.get(selector),
};

type RichTextStory = StoryObj<RichTextView>;

const meta: Meta<RichTextView> = {
  title: 'Rules/Rich text',
  component: RichTextView,
  decorators: [applicationConfig({ providers: [provideRichTextLinks(LINKS)] })],
  args: { headingLevel: HeadingLevel.Two },
};
export default meta;

/** Prose with inline rules: a check, damage, an area, a duration and a link to another entry. */
export const Prose: RichTextStory = {
  args: {
    text: RichText.parse([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'A roaring blast of fire deals ' },
          { type: 'damage', instances: [{ formula: '6d6', damageType: 'fire' }] },
          { type: 'text', text: ' in a ' },
          { type: 'template', shape: 'burst', size: 20 },
          { type: 'text', text: ' with a ' },
          { type: 'check', statistic: 'save:reflex', basic: true },
          { type: 'text', text: '. A creature that fails is ' },
          { type: 'ref', id: OFF_GUARD },
          { type: 'text', text: ' for ' },
          { type: 'duration', count: 1, unit: 'round' },
          { type: 'text', text: '.' },
        ],
      },
    ]),
  },
};

/** Headings, nested lists and a table, as heightened entries use them. */
export const Structure: RichTextStory = {
  args: {
    text: RichText.parse([
      { type: 'heading', level: 1, content: [{ type: 'text', text: 'Heightened' }] },
      {
        type: 'list',
        ordered: false,
        items: [
          [{ type: 'paragraph', content: [{ type: 'text', text: '+1 The damage increases by 2d6.' }] }],
          [
            { type: 'paragraph', content: [{ type: 'text', text: '+2 The burst grows:' }] },
            {
              type: 'list',
              ordered: true,
              items: [[{ type: 'paragraph', content: [{ type: 'template', shape: 'burst', size: 30 }] }]],
            },
          ],
        ],
      },
      {
        type: 'table',
        header: [[{ type: 'text', text: 'Rank' }], [{ type: 'text', text: 'Damage' }]],
        rows: [
          [[{ type: 'text', text: '4th' }], [{ type: 'damage', instances: [{ formula: '8d6', damageType: 'fire' }] }]],
        ],
      },
    ]),
  },
};
