import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { applicationConfig } from '@analogjs/storybook-angular';
import type { LinkTarget } from '@pioneer/frontier';
import { ContentId } from '@pioneer/rules/sdk';

import { ContentPreview } from './content-preview.component';
import { provideEntryPreviews } from './entry-preview';
import type { EntryPreview } from './entry-preview';
import {
  CLUMSY_ENDINGS_PREVIEW,
  CLUMSY_ID,
  CLUMSY_NOT_HELD_PREVIEW,
  FIREBALL,
  FIREBALL_PREVIEW,
} from './entry-preview.fixtures';

type ContentPreviewStory = StoryObj<ContentPreview>;

const TARGET: LinkTarget = ['/content', 'spell', 'fireball'];

/** Opens a card beside whatever it wraps on hover or focus; on touch the first tap opens it and the second follows. */
const meta: Meta<ContentPreview> = {
  title: 'Rules/Content preview',
  component: ContentPreview,
  args: { entry: ContentId.parse(FIREBALL) },
  parameters: { layout: 'padded' },
  render: (args) => ({ props: args, template: `<pio-content-preview [entry]="entry">Fireball</pio-content-preview>` }),
};
export default meta;

/** The page holds the entry: the card opens at once and links to the entry in full. */
export const Held: ContentPreviewStory = {
  decorators: [
    applicationConfig({
      providers: [
        provideEntryPreviews({ preview: (): EntryPreview => FIREBALL_PREVIEW, target: (): LinkTarget => TARGET }),
      ],
    }),
  ],
};

/** The page fetches the entry when the card first opens: a skeleton shows meanwhile. */
export const Loading: ContentPreviewStory = {
  decorators: [
    applicationConfig({
      providers: [
        provideEntryPreviews({
          preview: (): undefined => undefined,
          load: async (): Promise<EntryPreview | undefined> =>
            Promise.withResolvers<EntryPreview | undefined>().promise,
        }),
      ],
    }),
  ],
};

/** The fetch failed: the card says so, and tries again the next time it opens. */
export const Failed: ContentPreviewStory = {
  decorators: [
    applicationConfig({
      providers: [
        provideEntryPreviews({
          preview: (): undefined => undefined,
          load: async (): Promise<EntryPreview | undefined> => {
            throw new Error('offline');
          },
        }),
      ],
    }),
  ],
};

/** A condition the character holds: its value, what it does to their statistics and how they can end it. */
export const ConditionHeld: ContentPreviewStory = {
  args: { entry: CLUMSY_ID },
  render: (args) => ({ props: args, template: `<pio-content-preview [entry]="entry">Clumsy 2</pio-content-preview>` }),
  decorators: [
    applicationConfig({
      providers: [provideEntryPreviews({ preview: (): EntryPreview => CLUMSY_ENDINGS_PREVIEW })],
    }),
  ],
};

/** A condition the reader lacks: the generic rule and the ways it ends, with no value or effects of their own. */
export const ConditionNotHeld: ContentPreviewStory = {
  args: { entry: CLUMSY_ID },
  render: (args) => ({ props: args, template: `<pio-content-preview [entry]="entry">Clumsy</pio-content-preview>` }),
  decorators: [
    applicationConfig({
      providers: [provideEntryPreviews({ preview: (): EntryPreview => CLUMSY_NOT_HELD_PREVIEW })],
    }),
  ],
};
