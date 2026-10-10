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
  },
  // Content is bound, not pasted into the template: braces in it (JSON) would read as Angular syntax.
  render: ({ content, ...args }) => ({
    props: { ...args, content },
    template: `<fr-text ${argsToTemplate(args)}>{{ content }}</fr-text>`,
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

/** Block code: keeps line breaks and indentation, for formatted JSON; long lines wrap. */
export const Preformatted: TextStory = {
  args: {
    element: TextElement.Preformatted,
    content: '[\n  "self:condition:frightened",\n  { "not": "item:trait:agile" }\n]',
  },
};

/** A formula or identifier, set in the mono font. */
export const Code: TextStory = { args: { element: TextElement.Code, content: '@actor.level + 3' } };

/** A key the user presses. */
export const Keyboard: TextStory = { args: { element: TextElement.Keyboard, content: 'Enter' } };

/** An abbreviation; `expansion` spells it out. */
export const Abbreviation: TextStory = {
  args: { element: TextElement.Abbreviation, expansion: 'Armor Class', content: 'AC' },
};

/** A short inline quotation; the browser adds the quotation marks. */
export const Quotation: TextStory = { args: { element: TextElement.Quotation, content: 'Strike true' } };

/** Stress emphasis. */
export const Emphasis: TextStory = { args: { element: TextElement.Emphasis, content: 'until the end of your turn' } };

/** Strong importance. */
export const Strong: TextStory = { args: { element: TextElement.Strong, content: 'Critical Success' } };

/** Inline elements in running text. */
export const InlineElements: TextStory = {
  render: () => ({
    template: `
      <fr-text element="p">
        Press <fr-text element="kbd">Enter</fr-text> to roll <fr-text element="code">1d20 + 7</fr-text> against
        the target's <fr-text element="abbr" expansion="Armor Class">AC</fr-text>. The GM calls out
        <fr-text element="q">Strike true</fr-text>.
      </fr-text>
    `,
  }),
};

export const Truncated: TextStory = {
  args: {
    truncate: true,
    content:
      'A very long line of text that will not fit in the space it has, so it is cut off with an ellipsis instead of wrapping.',
  },
};
