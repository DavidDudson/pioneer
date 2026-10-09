import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';

import { Stack } from '../../layout/stack/stack.component';
import { Surface } from '../../layout/surface/surface.component';
import { Text } from '../../text/text/text.component';
import { Space } from '../../tokens';
import { VirtualItem } from './virtual-item.directive';
import { VirtualEstimate, VirtualList } from './virtual-list.component';

interface Creature {
  readonly id: string;
  readonly name: string;
  readonly level: number;
}

type VirtualListStory = StoryObj<VirtualList<Creature>>;

const BESTIARY_SIZE = 1000;
const MAX_LEVEL = 25;

const BESTIARY: readonly Creature[] = Array.from({ length: BESTIARY_SIZE }, (_slot, index) => ({
  id: `creature-${index}`,
  name: `Creature ${index + 1}`,
  level: index % MAX_LEVEL,
}));

/** Only the rows on screen render; the page scrolls, not the list. Rows are measured as they render. */
const meta: Meta<VirtualList<Creature>> = {
  title: 'Data/Virtual List',
  component: VirtualList,
  decorators: [moduleMetadata({ imports: [Stack, Surface, Text, VirtualItem] })],
  argTypes: {
    gap: { control: 'select', options: Object.values(Space) },
    estimate: { control: 'inline-radio', options: Object.values(VirtualEstimate) },
    itemKey: { control: false },
  },
  args: {
    gap: Space.Sm,
    estimate: VirtualEstimate.Sm,
    itemKey: (creature: Creature): string => creature.id,
  },
  render: (args) => ({
    props: { ...args, bestiary: BESTIARY },
    template: `
      <fr-virtual-list ${argsToTemplate(args)}>
        <ng-template let-creature [frVirtualItem]="bestiary">
          <fr-surface padding="sm">
            <fr-stack direction="horizontal" justify="between">
              <fr-text>{{ creature.name }}</fr-text>
              <fr-text tone="muted" numeric>Level {{ creature.level }}</fr-text>
            </fr-stack>
          </fr-surface>
        </ng-template>
      </fr-virtual-list>
    `,
  }),
};
export default meta;

export const ThousandRows: VirtualListStory = {};
