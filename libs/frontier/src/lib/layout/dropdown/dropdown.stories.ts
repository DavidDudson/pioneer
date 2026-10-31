import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { LucideMenu } from '@lucide/angular';
import { expect, userEvent, within } from 'storybook/test';

import { Link } from '../../actions/link/link.component';
import { Avatar } from '../../media/avatar/avatar.component';
import { Stack } from '../stack/stack.component';
import { Dropdown } from './dropdown.component';

type DropdownStory = StoryObj<Dropdown>;

/** A button that opens a panel of links or controls beside it. Escape, a press outside, or following a link closes it. */
const meta: Meta<Dropdown> = {
  title: 'Layout/Dropdown',
  component: Dropdown,
  decorators: [moduleMetadata({ imports: [Avatar, Link, Stack] })],
  parameters: { layout: 'padded' },
  args: { label: 'Sections' },
  render: (args) => ({
    props: { ...args, menu: LucideMenu },
    template: `
      <fr-dropdown [label]="label" [icon]="menu">
        <fr-stack gap="2xs">
          <fr-link to="/characters">Characters</fr-link>
          <fr-link to="/campaigns">Campaigns</fr-link>
        </fr-stack>
      </fr-dropdown>`,
  }),
};
export default meta;

/** Icon-only: the label names the button. */
export const IconOnly: DropdownStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Sections' }));
    await expect(within(document.body).getByRole('link', { name: 'Characters' })).toBeVisible();
  },
};

/** A visible caption with a caret, like the theme picker. */
export const Captioned: DropdownStory = {
  args: { label: 'Theme', caption: 'Dynamic' },
  render: (args) => ({
    props: args,
    template: `<fr-dropdown [label]="label" [caption]="caption"><fr-stack gap="2xs"><fr-link to="/">Dynamic</fr-link><fr-link to="/">Tavern</fr-link></fr-stack></fr-dropdown>`,
  }),
};

/** Any projected `[frDropdownTrigger]` content, such as an avatar, with `custom`. */
export const AvatarTrigger: DropdownStory = {
  args: { label: 'Account menu', custom: true },
  render: (args) => ({
    props: args,
    template: `
      <fr-dropdown [label]="label" [custom]="custom">
        <fr-avatar frDropdownTrigger size="sm" decorative name="Amiri" />
        <fr-link to="/account">Amiri</fr-link>
      </fr-dropdown>`,
  }),
};
