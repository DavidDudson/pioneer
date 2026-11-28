import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { Button } from '../../actions/button/button.component';
import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Avatar } from '../../media/avatar/avatar.component';
import { Badge } from '../../text/badge/badge.component';
import { ItemActions } from '../item/item-actions.component';
import { ItemContent } from '../item/item-content.component';
import { ItemMedia } from '../item/item-media.component';
import { List } from '../list/list.component';
import { ListItem } from './list-item.component';

type ListItemStory = StoryObj<ListItem>;

const meta: Meta<ListItem> = {
  title: 'Lists/List item',
  component: ListItem,
  subcomponents: { ItemMedia, ItemContent, ItemActions },
  decorators: [
    moduleMetadata({ imports: [Avatar, Badge, Button, ItemActions, ItemContent, ItemMedia, List, Skeleton] }),
  ],
  args: { padding: 'md', divided: true },
};

export default meta;

/** Avatar, title, byline, badge and trailing actions, composed without a hand-built stack. */
export const Row: ListItemStory = {
  render: (args) => ({
    props: args,
    template: `
      <fr-list gap="none">
        @for (name of ['Valeros', 'Kyra']; track name) {
          <fr-list-item [padding]="padding" [divided]="divided">
            <fr-item-media><fr-avatar [name]="name" /></fr-item-media>
            <fr-item-content [heading]="name" byline="Level 3 fighter"><fr-badge>GM</fr-badge></fr-item-content>
            <fr-item-actions><fr-button variant="ghost">Open</fr-button></fr-item-actions>
          </fr-list-item>
        }
      </fr-list>
    `,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(2);
    await expect(canvas.getAllByRole('button', { name: 'Open' })).toHaveLength(2);
  },
};

/** `fr-skeleton kind="item"` is the same row while it loads. */
export const Loading: ListItemStory = {
  render: (args) => ({
    props: args,
    template: `
      <fr-list gap="none">
        <fr-list-item [padding]="padding"><fr-skeleton kind="item" /></fr-list-item>
      </fr-list>
    `,
  }),
};
