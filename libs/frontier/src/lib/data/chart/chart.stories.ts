import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { barX, defineChart, lineY } from '@tanstack/charts';
import type { ChartDefinition } from '@tanstack/charts/angular';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';

import { Chart, ChartAspect } from './chart.component';

type ChartStory = StoryObj<Chart>;

const DAMAGE_BY_ROUND = [
  { round: 1, damage: 8 },
  { round: 2, damage: 14 },
  { round: 3, damage: 11 },
  { round: 4, damage: 21 },
  { round: 5, damage: 17 },
  { round: 6, damage: 25 },
];

const KILLS_BY_MEMBER = [
  { member: 'Valeros', kills: 12 },
  { member: 'Seoni', kills: 9 },
  { member: 'Merisiel', kills: 7 },
  { member: 'Kyra', kills: 3 },
];

const DAMAGE_LINE: ChartDefinition = defineChart({
  marks: [lineY(DAMAGE_BY_ROUND, { x: 'round', y: 'damage' })],
  scales: {
    x: { scale: scaleLinear, axis: { label: 'Round' } },
    y: { scale: scaleLinear, nice: true, axis: { label: 'Damage' } },
  },
});

/** Gap between bars, as a fraction of each band. */
const BAR_PADDING = 0.1;

const KILLS_BAR: ChartDefinition = defineChart({
  marks: [barX(KILLS_BY_MEMBER, { x: 'kills', y: 'member' })],
  scales: {
    x: { scale: scaleLinear, nice: true, axis: { label: 'Kills' } },
    y: { scale: () => scaleBand().padding(BAR_PADDING) },
  },
});

/** TanStack Charts, themed by frontier: series use `--fr-chart-*`, axes the text colour; both follow the mode. */
const meta: Meta<Chart> = {
  title: 'Data/Chart',
  component: Chart,
  argTypes: {
    definition: { control: false },
    aspect: { control: 'inline-radio', options: Object.values(ChartAspect) },
  },
  args: {
    definition: DAMAGE_LINE,
    label: 'Party damage per round',
    description: 'Damage rises over the fight, peaking at 25 in round 6.',
    aspect: ChartAspect.Wide,
  },
  render: (args) => ({
    props: args,
    template: `<fr-chart ${argsToTemplate(args)} />`,
  }),
};
export default meta;

export const Line: ChartStory = {};

export const Bar: ChartStory = {
  args: { definition: KILLS_BAR, label: 'Kills per party member', description: undefined },
};

export const Standard: ChartStory = { args: { aspect: ChartAspect.Standard } };

export const Square: ChartStory = { args: { aspect: ChartAspect.Square } };
