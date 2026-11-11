import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, within } from 'storybook/test';

import type { SpellFilterGroup, SpellFilterOption } from './spell-filter-line';
import { SpellFilter } from './spell-filter.component';

type SpellFilterStory = StoryObj<SpellFilter>;

function groupOf(id: string, label: string, options: readonly SpellFilterOption[]): SpellFilterGroup {
  return { id, label, options, selected: new Set() };
}

const TARGETS = groupOf('target', 'Targets', [
  { value: 'single', label: 'Single target', count: 4 },
  { value: 'multiple', label: 'Multiple targets', count: 2 },
]);
const TRAITS = [
  { value: 'Mental', label: 'Mental', count: 3 },
  { value: 'Fire', label: 'Fire', count: 1 },
];
const SOURCES = groupOf('source', 'Source', [
  { value: 'Animist spellcasting', label: 'Animist spellcasting', count: 5 },
  { value: 'Wand of Fear', label: 'Wand of Fear', count: 1 },
]);
const GROUPS: readonly SpellFilterGroup[] = [TARGETS, groupOf('trait', 'Traits', TRAITS), SOURCES];

const meta: Meta<SpellFilter> = { title: 'Rules/Spell Filter', component: SpellFilter, args: { groups: GROUPS } };
export default meta;

/** Each property collapsed to its name; open one to pick values, each with how many spells it would leave. */
export const Default: SpellFilterStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Traits'));
    await expect(canvas.getByRole('button', { name: 'Mental (3)' })).toBeVisible();
  },
};

const PICKED: readonly SpellFilterGroup[] = [
  TARGETS,
  { ...groupOf('trait', 'Traits', TRAITS), selected: new Set(['Mental']) },
  SOURCES,
];

/** Picks are listed under the rows, with a button that clears all of them. */
export const Picked: SpellFilterStory = {
  args: { groups: PICKED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Showing only: Mental')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  },
};
