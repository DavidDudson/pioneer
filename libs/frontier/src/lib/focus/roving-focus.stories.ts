import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { Button } from '../actions/button/button.component';
import { Grid } from '../layout/grid/grid.component';
import { pressKeys } from '../testing/story-keyboard';
import { RovingFocusItem } from './roving-focus-item.directive';
import { RovingFocus } from './roving-focus.directive';

type RovingFocusStory = StoryObj;

const SKILLS = [
  'Acrobatics',
  'Arcana',
  'Athletics',
  'Crafting',
  'Deception',
  'Diplomacy',
  'Intimidation',
  'Medicine',
  'Nature',
  'Occultism',
  'Religion',
  'Stealth',
];

/** One Tab stop for a dense group; arrow keys, Home and End move inside it. Grid columns follow the layout. */
const meta: Meta = {
  title: 'Focus/Roving focus',
  decorators: [moduleMetadata({ imports: [Button, Grid, RovingFocus, RovingFocusItem] })],
  parameters: { layout: 'padded' },
  render: () => ({
    props: { skills: SKILLS },
    template: `
      <fr-grid role="toolbar" aria-label="Skills" frRovingFocus="grid" [columns]="6" gap="xs">
        @for (skill of skills; track skill) {
          <fr-button frRovingFocusItem>{{ skill }}</fr-button>
        }
      </fr-grid>
    `,
  }),
};
export default meta;

export const Grid6: RovingFocusStory = {};

interface Position {
  readonly top: number;
  readonly left: number;
}

/** Where an element sits, rounded so sub-pixel layout doesn't matter. */
function position(element: Element): Position {
  const rect = element.getBoundingClientRect();
  return { top: Math.round(rect.top), left: Math.round(rect.left) };
}

/**
 * Keyboard: with columns counted from the layout, Down lands on the item straight below and Right stays on the
 * row. Runs only in `nx test-storybook frontier`.
 */
export const GridKeyboard: RovingFocusStory = {
  // Real key presses need the Vitest runner (testing/story-keyboard.ts), so this story is test-only.
  tags: ['!dev'],
  play: async ({ canvasElement, userEvent }) => {
    const first = within(canvasElement).getByRole('button', { name: 'Acrobatics' });
    await userEvent.tab();
    await expect(first).toHaveFocus();
    await pressKeys('{ArrowDown}');
    const below = position(document.activeElement ?? first);
    await expect(below.left).toBe(position(first).left);
    await expect(below.top).toBeGreaterThan(position(first).top);
    await pressKeys('{ArrowUp}{ArrowRight}');
    await expect(position(document.activeElement ?? first).top).toBe(position(first).top);
  },
};
