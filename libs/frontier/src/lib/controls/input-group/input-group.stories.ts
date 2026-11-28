import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { moduleMetadata } from '@analogjs/storybook-angular';
import { Search } from 'lucide';

import { Button } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { Input } from '../input/input.component';
import { InputAddon } from './input-addon.component';
import { InputGroup } from './input-group.component';

type InputGroupStory = StoryObj<InputGroup>;

/**
 * One box around an input and its addons. Addons go before or after the input, as many as needed; the group draws
 * the border, focus ring and status, so nothing assumes two 44px buttons.
 */
const meta: Meta<InputGroup> = {
  title: 'Controls/Input Group',
  component: InputGroup,
  decorators: [moduleMetadata({ imports: [Button, Icon, Input, InputAddon] })],
  args: { invalid: false, disabled: false, status: 'idle' },
  render: (args) => ({
    props: { ...args, SearchIcon: Search },
    template: `
      <fr-input-group [invalid]="invalid" [disabled]="disabled" [status]="status">
        <fr-input-addon><fr-icon [icon]="SearchIcon" /></fr-input-addon>
        <fr-input ariaLabel="Query" placeholder="Search" />
      </fr-input-group>`,
  }),
};

export default meta;

export const IconBefore: InputGroupStory = {};

/** Three action addons after the input: the group grows, nothing is positioned over the input. */
export const ManyActions: InputGroupStory = {
  render: (args) => ({
    props: { ...args, SearchIcon: Search },
    template: `
      <fr-input-group [invalid]="invalid" [disabled]="disabled" [status]="status">
        <fr-input ariaLabel="Query" placeholder="Search" />
        <fr-input-addon action>
          <fr-button variant="ghost" size="sm" iconOnly ariaLabel="One"><fr-icon [icon]="SearchIcon" /></fr-button>
          <fr-button variant="ghost" size="sm" iconOnly ariaLabel="Two"><fr-icon [icon]="SearchIcon" /></fr-button>
          <fr-button variant="ghost" size="sm" iconOnly ariaLabel="Three"><fr-icon [icon]="SearchIcon" /></fr-button>
        </fr-input-addon>
      </fr-input-group>`,
  }),
};

export const Invalid: InputGroupStory = { args: { invalid: true } };

export const Pending: InputGroupStory = { args: { status: 'pending' } };

export const Disabled: InputGroupStory = { args: { disabled: true } };
