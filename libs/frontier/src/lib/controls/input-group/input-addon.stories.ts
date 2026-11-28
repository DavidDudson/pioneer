import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { moduleMetadata } from '@analogjs/storybook-angular';
import { Search } from 'lucide';

import { Button } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { Input } from '../input/input.component';
import { InputAddon } from './input-addon.component';
import { InputGroup } from './input-group.component';

type InputAddonStory = StoryObj<InputAddon>;

/**
 * A part of an `fr-input-group`. By default it is a decorative icon, and presses pass through to the input; with
 * `action` it holds buttons and takes presses.
 */
const meta: Meta<InputAddon> = {
  title: 'Controls/Input Addon',
  component: InputAddon,
  decorators: [moduleMetadata({ imports: [Button, Icon, Input, InputGroup] })],
  args: { action: false },
  render: (args) => ({
    props: { ...args, SearchIcon: Search },
    template: `
      <fr-input-group>
        <fr-input-addon [action]="action">
          @if (action) {
            <fr-button variant="ghost" size="sm" iconOnly ariaLabel="Search"><fr-icon [icon]="SearchIcon" /></fr-button>
          } @else {
            <fr-icon [icon]="SearchIcon" />
          }
        </fr-input-addon>
        <fr-input ariaLabel="Query" placeholder="Search" />
      </fr-input-group>`,
  }),
};

export default meta;

export const Decorative: InputAddonStory = {};

export const Action: InputAddonStory = { args: { action: true } };
