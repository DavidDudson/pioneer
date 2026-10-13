import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { LucideFlame } from '@lucide/angular';

import { BadgeTone } from '../badge/badge.component';
import { Tag } from './tag.component';

type TagStory = StoryObj<Tag>;

/** A badge fed by a `label` input, for places that hold data rather than content, such as table cells. */
const meta: Meta<Tag> = {
  title: 'Text/Tag',
  component: Tag,
  argTypes: {
    tone: { control: 'inline-radio', options: Object.values(BadgeTone) },
    icon: { control: false },
  },
  args: { label: 'Fire', tone: BadgeTone.Neutral },
  render: (args) => ({
    props: args,
    // A Lucide icon is a class, and argsToTemplate drops function args.
    template: `<fr-tag [icon]="icon" ${argsToTemplate(args, { exclude: ['icon'] })} />`,
  }),
};
export default meta;

export const Default: TagStory = {};

export const WithIcon: TagStory = { args: { icon: LucideFlame, tone: BadgeTone.Danger } };
