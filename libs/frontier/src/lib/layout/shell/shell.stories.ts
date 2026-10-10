import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { LucideMoon } from '@lucide/angular';

import { Button } from '../../actions/button/button.component';
import { Link } from '../../actions/link/link.component';
import { Icon } from '../../icon/icon.component';
import { Text } from '../../text/text/text.component';
import { Page } from '../page/page.component';
import { Stack } from '../stack/stack.component';
import { Surface } from '../surface/surface.component';
import { Shell } from './shell.component';

type ShellStory = StoryObj<Shell>;

const meta: Meta<Shell> = {
  title: 'Layout/Shell',
  component: Shell,
  decorators: [moduleMetadata({ imports: [Button, Icon, Link, Page, Stack, Surface, Text] })],
  args: { brand: 'Pioneer' },
  parameters: {
    layout: 'fullscreen',
    a11y: {
      config: {
        // Known: the <header> of fr-page counts as a second banner while fr-page owns <main>.
        // Moving <main> into fr-shell (#149) fixes it; drop these rules then.
        rules: [
          { id: 'landmark-no-duplicate-banner', enabled: false },
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
  },
  render: (args) => ({
    props: { ...args, moon: LucideMoon },
    template: `
      <fr-shell ${argsToTemplate(args)}>
        <fr-stack frShellNav direction="horizontal" gap="md">
          <fr-link to="/characters">Characters</fr-link>
          <fr-link to="/play">Play</fr-link>
          <fr-link to="/legal">Legal</fr-link>
        </fr-stack>
        <fr-button frShellActions variant="ghost" ariaLabel="Toggle colour mode">
          <fr-icon [icon]="moon" />
        </fr-button>
        <fr-page title="Characters">
          <fr-surface><fr-text element="p">Routed content renders here.</fr-text></fr-surface>
        </fr-page>
        <fr-text frShellFooter variant="caption" tone="subtle">Pathfinder 2e character manager</fr-text>
      </fr-shell>
    `,
  }),
};
export default meta;

export const Default: ShellStory = {};
