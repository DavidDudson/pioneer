import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Tone } from '../../tokens';
import { FontWeight, TextVariant } from '../text.variants';
import { Text, TextElement } from './text.component';

interface TextStoryArgs extends Text {
  readonly content: string;
}

type TextStory = StoryObj<TextStoryArgs>;

const meta: Meta<TextStoryArgs> = {
  title: 'Text/Text',
  component: Text,
  decorators: [moduleMetadata({ imports: [Stack] })],
  argTypes: {
    element: { control: 'inline-radio', options: Object.values(TextElement) },
    variant: { control: 'select', options: Object.values(TextVariant) },
    tone: { control: 'select', options: Object.values(Tone) },
    weight: { control: 'inline-radio', options: [undefined, ...Object.values(FontWeight)] },
  },
  args: {
    content: 'The party pushes deeper into the Stolen Lands.',
    element: TextElement.Span,
    variant: TextVariant.Body,
    tone: Tone.Default,
    truncate: false,
    numeric: false,
    preformatted: false,
  },
  render: ({ content, ...args }) => ({
    props: args,
    template: `<fr-text ${argsToTemplate(args)}>${content}</fr-text>`,
  }),
};
export default meta;

export const Body: TextStory = {};

export const Paragraph: TextStory = { args: { element: TextElement.Paragraph } };

export const Variants: TextStory = {
  render: () => ({
    props: { variants: Object.values(TextVariant) },
    template: `
      <fr-stack gap="sm">
        @for (variant of variants; track variant) {
          <fr-text [variant]="variant">{{ variant }}: Pioneer</fr-text>
        }
      </fr-stack>
    `,
  }),
};

export const Tones: TextStory = {
  render: () => ({
    props: { tones: Object.values(Tone) },
    template: `
      <fr-stack gap="xs">
        @for (tone of tones; track tone) {
          <fr-text [tone]="tone">{{ tone }}</fr-text>
        }
      </fr-stack>
    `,
  }),
};

export const Weights: TextStory = {
  render: () => ({
    props: { weights: Object.values(FontWeight) },
    template: `
      <fr-stack gap="xs">
        @for (weight of weights; track weight) {
          <fr-text [weight]="weight">{{ weight }}</fr-text>
        }
      </fr-stack>
    `,
  }),
};

/** Tabular figures, so columns of numbers line up. */
export const Numeric: TextStory = { args: { content: '1,234,567', numeric: true } };

/** Keeps line breaks and indentation, for formatted JSON; long lines wrap. */
export const Preformatted: TextStory = {
  args: {
    element: TextElement.Paragraph,
    variant: TextVariant.Code,
    preformatted: true,
    content: '[\n  "self:condition:frightened",\n  { "not": "item:trait:agile" }\n]',
  },
};

export const Truncated: TextStory = {
  args: {
    truncate: true,
    content:
      'A very long line of text that will not fit in the space it has, so it is cut off with an ellipsis instead of wrapping.',
  },
};
