import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { moduleMetadata } from '@analogjs/storybook-angular';

import { Link } from '../../actions/link/link.component';
import { Text } from '../../text/text/text.component';
import { HoverCardContent } from './hover-card-content.directive';
import { HoverCard } from './hover-card.component';

type HoverCardStory = StoryObj<HoverCard>;

/** A description beside its trigger while the pointer rests on it or focus is inside. Escape closes it. */
const meta: Meta<HoverCard> = {
  title: 'Layout/Hover card',
  component: HoverCard,
  decorators: [moduleMetadata({ imports: [HoverCard, HoverCardContent, Link, Text] })],
  parameters: { layout: 'padded' },
  render: () => ({
    template: `
      <fr-text element="p">
        Cast
        <fr-hover-card>
          <fr-link href="#fireball">Fireball</fr-link>
          <ng-template frHoverCardContent>
            <fr-text element="p">A burst of flame. 6d6 fire damage, basic Reflex save.</fr-text>
          </ng-template>
        </fr-hover-card>
        at the door.
      </fr-text>`,
  }),
};
export default meta;

export const Default: HoverCardStory = {};
