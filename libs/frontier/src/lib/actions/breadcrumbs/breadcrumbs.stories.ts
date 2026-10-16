import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, within } from 'storybook/test';

import { Breadcrumbs } from './breadcrumbs.component';

type BreadcrumbsStory = StoryObj<Breadcrumbs>;

const meta: Meta<Breadcrumbs> = {
  title: 'Actions/Breadcrumbs',
  component: Breadcrumbs,
  args: {
    label: 'Breadcrumb',
    items: [
      { label: 'Content Browser', to: '/content' },
      { label: 'Spells', to: '/content/spells' },
      { label: 'Fireball' },
    ],
  },
  parameters: { layout: 'padded' },
};
export default meta;

/** The last item is the current page: text, not a link. */
export const Default: BreadcrumbsStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Fireball')).toHaveAttribute('aria-current', 'page');
    await expect(canvas.getAllByRole('link')).toHaveLength(2);
  },
};

/** A deep path in a narrow column: the middle items cut off with an ellipsis, the line never wraps. */
export const Narrow: BreadcrumbsStory = {
  args: {
    items: [
      { label: 'Content Browser', to: '/content' },
      { label: 'Spells of the Mwangi Expanse', to: '/content/spells' },
      { label: 'Evocation', to: '/content/spells/evocation' },
      { label: 'Fireball' },
    ],
  },
  decorators: [(story) => ({ ...story(), template: `<div style="width: 18rem">${story().template}</div>` })],
};

export const SingleItem: BreadcrumbsStory = { args: { items: [{ label: 'Content Browser' }] } };
