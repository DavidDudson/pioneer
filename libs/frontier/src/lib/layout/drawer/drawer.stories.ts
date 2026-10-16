import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import { Text } from '../../text/text/text.component';
import { PageBody } from '../page-body/page-body.component';
import { PageHeader } from '../page-header/page-header.component';
import { Page } from '../page/page.component';
import { Surface } from '../surface/surface.component';
import { Drawer } from './drawer.component';

type DrawerStory = StoryObj<Drawer>;

const meta: Meta<Drawer> = {
  title: 'Layout/Drawer',
  component: Drawer,
  decorators: [moduleMetadata({ imports: [Page, PageBody, PageHeader, Surface, Text] })],
  args: { title: 'Fireball', open: true },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: args,
    template: `
      <fr-page>
        <fr-page-header title="Spells" />
        <fr-page-body>
          <fr-surface><fr-text element="p">The spell list. It narrows and reflows when the drawer opens.</fr-text></fr-surface>
        </fr-page-body>
        <fr-drawer [title]="title" [(open)]="open">
          <fr-text element="p">A burst of flame fills the area.</fr-text>
        </fr-drawer>
      </fr-page>
    `,
  }),
};
export default meta;

/** Docked beside the content from the `lg` container size, pushing it aside; stacked under it when narrower. */
export const Open: DrawerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('complementary', { name: 'Fireball' })).toBeVisible();
    await expect(canvas.getByText('The spell list. It narrows and reflows when the drawer opens.')).toBeVisible();
  },
};

export const Closed: DrawerStory = {
  args: { open: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('complementary', { name: 'Fireball' })).toBeNull();
  },
};

/** The close button closes it; Escape does the same while focus is inside. */
export const Closing: DrawerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Close Fireball' }));
    await expect(canvas.queryByRole('complementary', { name: 'Fireball' })).toBeNull();
  },
};

/** Arrow keys on the handle step the width; the handle shows from the `lg` container size. */
export const Resizing: DrawerStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.getByRole('separator', { name: 'Resize Fireball' });
    handle.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(handle).toHaveAttribute('aria-valuetext', 'Wide');
    await userEvent.keyboard('{Home}');
    await expect(handle).toHaveAttribute('aria-valuetext', 'Narrow');
  },
};
