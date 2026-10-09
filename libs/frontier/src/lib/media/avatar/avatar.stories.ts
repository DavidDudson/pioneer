import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { BROKEN_IMAGE, storyImage } from '../../testing/story-images';
import { Text } from '../../text/text/text.component';
import { Size } from '../../tokens';
import { Avatar } from './avatar.component';

type AvatarStory = StoryObj<Avatar>;

const PORTRAIT = storyImage({ width: 200, height: 200, fromHue: 30, toHue: 280 });

const meta: Meta<Avatar> = {
  title: 'Media/Avatar',
  component: Avatar,
  decorators: [moduleMetadata({ imports: [Stack, Text] })],
  argTypes: {
    size: { control: 'inline-radio', options: Object.values(Size) },
  },
  args: { name: 'Seelah of the Dawn', src: PORTRAIT, size: Size.Md },
  render: (args) => ({
    props: args,
    template: `<fr-avatar ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Picture: AvatarStory = {};

/** No picture yet: the initials of the first and last words. */
export const Initials: AvatarStory = { args: { src: undefined } };

/** The picture failed to load, so the initials stand in. */
export const Failed: AvatarStory = { args: { src: BROKEN_IMAGE } };

/** Initials follow the active locale's segmentation: an accent stays on its letter. */
export const Accented: AvatarStory = { args: { name: 'Élodie Moreau', src: undefined } };

export const Sizes: AvatarStory = {
  render: () => ({
    props: { sizes: Object.values(Size), portrait: PORTRAIT },
    template: `
      <fr-stack direction="horizontal" align="end" gap="md">
        @for (size of sizes; track size) {
          <fr-avatar name="Seelah of the Dawn" [src]="portrait" [size]="size" />
          <fr-avatar name="Ezren" [size]="size" />
        }
      </fr-stack>
    `,
  }),
};

/** Beside the written name, the avatar is decorative. */
export const BesideName: AvatarStory = {
  render: () => ({
    props: { portrait: PORTRAIT },
    template: `
      <fr-stack direction="horizontal" align="center" gap="sm">
        <fr-avatar name="Seelah of the Dawn" [src]="portrait" size="sm" decorative />
        <fr-text>Seelah of the Dawn</fr-text>
      </fr-stack>
    `,
  }),
};
