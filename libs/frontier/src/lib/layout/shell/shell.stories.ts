import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { LucideMoon } from '@lucide/angular';
import { expect, within } from 'storybook/test';

import { Button } from '../../actions/button/button.component';
import { Link } from '../../actions/link/link.component';
import { Icon } from '../../icon/icon.component';
import { pressKeys } from '../../testing/story-keyboard';
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
  parameters: { layout: 'fullscreen' },
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
          <fr-surface>
            <fr-text element="p">Routed content renders here, like <fr-link to="/characters/valeros">Valeros</fr-link>.</fr-text>
          </fr-surface>
        </fr-page>
        <fr-text frShellFooter variant="caption" tone="subtle">Pathfinder 2e character manager</fr-text>
      </fr-shell>
    `,
  }),
};
export default meta;

export const Default: ShellStory = {};

/** Whether the span around the skip link fits its text: `sr-only` clips it to 1px (plus any padding) while hidden. */
function fitsText(skipLink: HTMLElement): boolean {
  const box = skipLink.closest('span')?.getBoundingClientRect().width ?? 0;
  return box >= skipLink.getBoundingClientRect().width;
}

/**
 * Keyboard: the first Tab shows the skip link, and Enter on it moves focus to `<main>`, so the next Tab lands in the
 * page instead of the header nav. Runs only in `nx test-storybook frontier`.
 */
export const SkipLink: ShellStory = {
  // Real key presses need the Vitest runner (testing/story-keyboard.ts), so this story is test-only.
  tags: ['!dev'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const skipLink = canvas.getByRole('link', { name: 'Skip to content' });
    const main = canvas.getByRole('main');
    await expect(fitsText(skipLink)).toBe(false);
    await pressKeys('{Tab}');
    await expect(skipLink).toHaveFocus();
    await expect(fitsText(skipLink)).toBe(true);
    await pressKeys('{Enter}');
    await expect(main).toHaveFocus();
    await pressKeys('{Tab}');
    await expect(canvas.getByRole('link', { name: 'Valeros' })).toHaveFocus();
  },
};
