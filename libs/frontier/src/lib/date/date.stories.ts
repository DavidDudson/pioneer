import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { Temporal } from '@pioneer/shared/kernel';

import { Stack } from '../layout/stack/stack.component';
import { Text } from '../text/text/text.component';
import { DateDisplay, DateFormat } from './date.component';

type DateStory = StoryObj<DateDisplay>;

const SESSION = Temporal.ZonedDateTime.from('2026-10-07T19:30:00[Pacific/Auckland]');

const meta: Meta<DateDisplay> = {
  title: 'Dates/Date',
  component: DateDisplay,
  decorators: [moduleMetadata({ imports: [Stack, Text] })],
  argTypes: {
    value: { control: false },
    format: { control: 'inline-radio', options: Object.values(DateFormat) },
  },
  args: { value: SESSION, format: DateFormat.Date },
  render: (args) => ({
    props: args,
    template: `<fr-date ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Date: DateStory = {};

export const DateTime: DateStory = { args: { format: DateFormat.DateTime } };

export const Relative: DateStory = {
  args: { format: DateFormat.Relative, value: Temporal.Now.instant().subtract({ hours: 3 }) },
};

/** Plain dates have no time, so `datetime` falls back to the date. */
export const PlainDate: DateStory = {
  args: { format: DateFormat.DateTime, value: Temporal.PlainDate.from('2026-10-07') },
};

export const InText: DateStory = {
  render: () => ({
    props: { updated: Temporal.Now.instant().subtract({ hours: 49 }) },
    template: `<fr-text variant="caption" tone="subtle">Updated <fr-date format="relative" [value]="updated" /></fr-text>`,
  }),
};
