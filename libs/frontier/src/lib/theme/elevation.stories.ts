import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Elevation, elevationVariants } from '../tokens';

type ElevationStory = StoryObj;

interface LevelRow {
  readonly level: Elevation;
  readonly components: string;
}

/** Which components sit at each level. A component takes its level from `elevationVariants`. */
const LEVEL_ROWS: ReadonlyArray<LevelRow> = [
  { level: Elevation.Flat, components: 'Shell header, footer and panel; surface (base)' },
  { level: Elevation.Raised, components: 'Surface and card, table header, character avatar chips' },
  {
    level: Elevation.Overlay,
    components:
      'Docked drawer, dropdown, hover card, select, combobox, picker, toast (surface only: its edge is its emphasis, and it keeps its radius)',
  },
  { level: Elevation.Modal, components: 'Modal, and the full-screen drawer below `lg`' },
];

/** Each level is a surface and its line. */
const meta: Meta = {
  title: 'Foundations/Elevation',
  parameters: { layout: 'padded' },
  render: () => ({
    props: { levels: Object.entries(elevationVariants), rows: LEVEL_ROWS },
    template: `
      <div class="flex flex-col gap-md">
      <div class="grid grid-cols-2 gap-md">
        @for (level of levels; track level[0]) {
          <div class="border p-md text-fg-default {{ level[1] }}">{{ level[0] }}</div>
        }
      </div>
      <table class="w-full text-body text-fg-default">
        <thead>
          <tr><th class="text-start">Level</th><th class="text-start">Components</th></tr>
        </thead>
        <tbody>
          @for (row of rows; track row.level) {
            <tr><td class="py-xs pe-md align-top">{{ row.level }}</td><td class="py-xs">{{ row.components }}</td></tr>
          }
        </tbody>
      </table>
      </div>
    `,
  }),
};

export default meta;

export const Levels: ElevationStory = {};
