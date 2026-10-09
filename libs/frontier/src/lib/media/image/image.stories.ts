import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { BROKEN_IMAGE, storyImage } from '../../testing/story-images';
import { ImageAspect, ImageDisplay, ImageFit, ImageLoading, ImageSize } from './image.component';

type ImageStory = StoryObj<ImageDisplay>;

const PORTRAIT = storyImage({ width: 300, height: 400, fromHue: 30, toHue: 280 });
const ART = storyImage({ width: 400, height: 300, fromHue: 140, toHue: 220 });
const LOGO = storyImage({ width: 120, height: 40, fromHue: 200, toHue: 200 });

const meta: Meta<ImageDisplay> = {
  title: 'Media/Image',
  component: ImageDisplay,
  decorators: [moduleMetadata({ imports: [Stack] })],
  argTypes: {
    size: { control: 'inline-radio', options: Object.values(ImageSize) },
    aspect: { control: 'inline-radio', options: Object.values(ImageAspect) },
    fit: { control: 'inline-radio', options: Object.values(ImageFit) },
    loading: { control: 'inline-radio', options: Object.values(ImageLoading) },
  },
  args: {
    src: ART,
    alt: 'A forest clearing at dusk',
    size: ImageSize.Lg,
    aspect: ImageAspect.Landscape,
    fit: ImageFit.Cover,
    loading: ImageLoading.Lazy,
  },
  render: (args) => ({
    props: args,
    template: `<fr-image ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Art: ImageStory = {};

/** A character portrait, 3:4. */
export const Portrait: ImageStory = {
  args: { src: PORTRAIT, alt: 'Seelah, a human champion', aspect: ImageAspect.Portrait },
};

/** A sign-in provider's logo next to its name: decorative, and contained so nothing is cropped. */
export const DecorativeLogo: ImageStory = {
  args: { src: LOGO, alt: '', decorative: true, size: ImageSize.Sm, fit: ImageFit.Contain },
};

/** The source failed: the frame keeps its size and shows the alt text. */
export const Failed: ImageStory = {
  args: { src: BROKEN_IMAGE, alt: 'A forest clearing at dusk' },
};

export const Sizes: ImageStory = {
  render: () => ({
    props: { sizes: [ImageSize.Sm, ImageSize.Md, ImageSize.Lg], art: ART },
    template: `
      <fr-stack direction="horizontal" align="end" gap="md">
        @for (size of sizes; track size) {
          <fr-image [src]="art" alt="Art" [size]="size" aspect="landscape" />
        }
      </fr-stack>
    `,
  }),
};

export const Aspects: ImageStory = {
  render: () => ({
    props: { aspects: Object.values(ImageAspect), art: ART },
    template: `
      <fr-stack direction="horizontal" align="end" gap="md">
        @for (aspect of aspects; track aspect) {
          <fr-image [src]="art" alt="Art" size="md" [aspect]="aspect" />
        }
      </fr-stack>
    `,
  }),
};
