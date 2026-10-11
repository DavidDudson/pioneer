import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { CommonFacet, FacetValue, RangeBound, SelectionKind } from '@pioneer/rules/sdk';
import type { FilterState } from '@pioneer/rules/sdk';
import { expect, userEvent, within } from 'storybook/test';

import { SHOP_FACET_COUNTS } from '../testing/facet-filter-fixtures';
import { FacetFilterView } from './facet-filter.component';

type FacetFilterStory = StoryObj<FacetFilterView>;

const meta: Meta<FacetFilterView> = {
  title: 'Rules/Facet Filter',
  component: FacetFilterView,
  args: { counts: SHOP_FACET_COUNTS, state: new Map() },
};
export default meta;

/** A shop's weapons and armour with nothing picked: each facet collapsed, its name only. */
export const Default: FacetFilterStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Rarity'));
    await expect(canvas.getByRole('button', { name: 'Uncommon (2)' })).toBeVisible();
  },
};

const PICKED: FilterState = new Map([
  [CommonFacet.Level, { kind: SelectionKind.Range, min: undefined, max: RangeBound.parse(2) }],
  [CommonFacet.Rarity, { kind: SelectionKind.Values, include: [FacetValue.parse('uncommon')], exclude: [] }],
]);

/** Up to level 2, uncommon only: the summaries say which facets narrow the list. */
export const Picked: FacetFilterStory = {
  args: { state: PICKED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Level: limited')).toBeVisible();
    await expect(canvas.getByText('Rarity: 1 picked')).toBeVisible();
  },
};
