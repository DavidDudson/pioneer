import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { DescriptionItem } from '../../list/description-item/description-item.component';
import { DescriptionList } from '../../list/description-list/description-list.component';
import { Meter, MeterVariant } from './meter.component';

type MeterStory = StoryObj<Meter>;

/** A current/max amount as a bar with the number beside it. */
const meta: Meta<Meter> = {
  title: 'Feedback/Meter',
  component: Meter,
  decorators: [moduleMetadata({ imports: [DescriptionItem, DescriptionList] })],
  argTypes: {
    variant: { control: 'inline-radio', options: Object.values(MeterVariant) },
    value: { control: { type: 'number' } },
  },
  args: {
    label: 'Hit points',
    value: 28,
    max: 40,
    low: 10,
    high: 20,
    optimum: 40,
  },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    template: `<fr-meter ${argsToTemplate(args)} />`,
  }),
};
export default meta;

/** HP above half: success. The meter carries the name and value text; the number is read once. */
export const Default: MeterStory = {
  play: async ({ canvasElement }) => {
    const meter = within(canvasElement).getByRole('meter', {
      name: 'Hit points',
    });
    await expect(meter).toHaveAttribute('aria-valuetext', '28 of 40');
  },
};

/** Below half: warning. */
export const Bloodied: MeterStory = { args: { value: 14 } };

/** At a quarter or less: danger. */
export const Critical: MeterStory = { args: { value: 4 } };

/** No thresholds: a plain amount in the accent. */
export const Resource: MeterStory = {
  args: {
    label: 'Focus points',
    value: 2,
    max: 3,
    low: undefined,
    high: undefined,
    optimum: undefined,
  },
};

/** Hero points, one block each. */
export const Segmented: MeterStory = {
  args: {
    label: 'Hero points',
    value: 1,
    max: 3,
    low: undefined,
    high: undefined,
    optimum: undefined,
    variant: MeterVariant.Segmented,
  },
};

/** Dying 0-4: low is good, so the tone worsens as it rises. */
export const Dying: MeterStory = {
  args: {
    label: 'Dying',
    value: 3,
    max: 4,
    low: 1,
    high: 2,
    optimum: 0,
    variant: MeterVariant.Segmented,
  },
};

/** As a sheet shows them: terms on the left, meters as values. */
export const OnASheet: MeterStory = {
  render: () => ({
    template: `
      <fr-description-list>
        <fr-description-item term="HP">
          <fr-meter label="Hit points" [value]="14" [max]="40" [low]="10" [high]="20" [optimum]="40" />
        </fr-description-item>
        <fr-description-item term="Focus">
          <fr-meter label="Focus points" [value]="1" [max]="2" variant="segmented" />
        </fr-description-item>
        <fr-description-item term="Dying">
          <fr-meter label="Dying" [value]="1" [max]="4" [low]="1" [high]="2" [optimum]="0" variant="segmented" />
        </fr-description-item>
      </fr-description-list>
    `,
  }),
};
