import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { EmptyState } from '../../feedback/empty-state/empty-state.component';
import { RovingFocusItem } from '../../focus/roving-focus-item.directive';
import { RovingFocus } from '../../focus/roving-focus.directive';
import { Grid } from '../../layout/grid/grid.component';
import { Section } from '../../layout/section/section.component';
import { Stack } from '../../layout/stack/stack.component';
import { pressKeys } from '../../testing/story-keyboard';
import { Text } from '../../text/text/text.component';
import { Button } from '../button/button.component';
import { SectionLink } from '../section-link/section-link.component';
import { SectionIndex } from './section-index.component';

type SectionIndexStory = StoryObj<SectionIndex>;

/** A section the story lays out: its anchor and heading. */
interface SectionEntry {
  readonly anchor: string;
  readonly label: string;
}

const SECTIONS: readonly SectionEntry[] = [
  { anchor: 'story-identity', label: 'Identity' },
  { anchor: 'story-attributes', label: 'Attributes' },
  { anchor: 'story-defences', label: 'Defences' },
];

const ATTRIBUTES = ['Strength +4', 'Dexterity +2', 'Constitution +2', 'Intelligence +0', 'Wisdom +1', 'Charisma -1'];

/**
 * The character sheet's layout: a section index of skip links, then fixed sections, each a region named by its
 * level 2 heading. Following an index link moves focus to that section's heading. The attribute grid is one Tab stop;
 * arrow keys move between its values.
 */
const meta: Meta<SectionIndex> = {
  title: 'Actions/Section Index',
  component: SectionIndex,
  decorators: [
    moduleMetadata({
      imports: [Button, EmptyState, Grid, RovingFocus, RovingFocusItem, Section, SectionLink, Stack, Text],
    }),
  ],
  parameters: { layout: 'padded' },
  args: { label: 'Sheet sections' },
  render: (args) => ({
    props: { ...args, sections: SECTIONS, attributes: ATTRIBUTES },
    template: `<fr-stack gap="lg">
      <fr-section-index [label]="label">
        @for (section of sections; track section.anchor) {
          <fr-section-link [anchor]="section.anchor">{{ section.label }}</fr-section-link>
        }
      </fr-section-index>
      <fr-section anchor="story-identity" heading="Identity">
        <fr-text element="p">Valeros, human fighter, level 3.</fr-text>
      </fr-section>
      <fr-section anchor="story-attributes" heading="Attributes">
        <fr-grid role="toolbar" aria-label="Attributes" frRovingFocus="grid" [columns]="6">
          @for (attribute of attributes; track attribute) {
            <fr-button frRovingFocusItem variant="inline">{{ attribute }}</fr-button>
          }
        </fr-grid>
      </fr-section>
      <fr-section anchor="story-defences" heading="Defences">
        <fr-empty-state title="No defences yet" description="Immunities, weaknesses and resistances show here." />
      </fr-section>
    </fr-stack>`,
  }),
};
export default meta;

export const SheetLayout: SectionIndexStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('navigation', { name: 'Sheet sections' })).toBeVisible();
    const regions = canvas.getAllByRole('region').map((region) => region.getAttribute('aria-labelledby'));
    await expect(regions).toStrictEqual(SECTIONS.map(({ anchor }) => anchor));
  },
};

/**
 * Keyboard: Enter on an index link focuses that section's heading; the next Tab enters the attribute grid on its
 * first value, the arrow keys move inside it and Tab leaves it in one press. Runs only in `nx test-storybook frontier`.
 */
export const Keyboard: SectionIndexStory = {
  // Real key presses need the Vitest runner (testing/story-keyboard.ts), so this story is test-only.
  tags: ['!dev'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('link', { name: 'Attributes' }).focus();
    await pressKeys('{Enter}');
    await expect(canvas.getByRole('heading', { level: 2, name: 'Attributes' })).toHaveFocus();

    await pressKeys('{Tab}');
    await expect(canvas.getByRole('button', { name: 'Strength +4' })).toHaveFocus();
    await pressKeys('{ArrowRight}');
    await expect(canvas.getByRole('button', { name: 'Dexterity +2' })).toHaveFocus();

    await pressKeys('{Tab}');
    const toolbar = canvas.getByRole('toolbar', { name: 'Attributes' });
    await expect(toolbar.contains(canvasElement.ownerDocument.activeElement)).toBe(false);
  },
};
