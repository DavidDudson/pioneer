import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { applicationConfig } from '@analogjs/storybook-angular';
import { BadgeTone } from '@pioneer/frontier';
import { Trait } from '@pioneer/rules/sdk';

import { provideEntryPreviews } from '../entry-preview/entry-preview';
import { TraitChip } from './trait-chip.component';
import {
  DEADLY_D8,
  FETCHED_TRAIT_PREVIEWS,
  FIRE,
  HELD_TRAIT_PREVIEWS,
  MANIPULATE,
  NOT_A_TRAIT,
} from './trait-chip.fixtures';

type TraitChipStory = StoryObj<TraitChip>;

/** A trait as a chip: hover or focus it for the trait's card; on touch the first tap opens it and the second follows. */
const meta: Meta<TraitChip> = {
  title: 'Rules/Trait chip',
  component: TraitChip,
  args: { trait: FIRE },
  parameters: { layout: 'padded' },
  decorators: [applicationConfig({ providers: [provideEntryPreviews(HELD_TRAIT_PREVIEWS)] })],
};
export default meta;

/** A trait whose entry has text: the card shows it. */
export const KnownTrait: TraitChipStory = {};

/** A trait whose entry has no text: the card shows only its name. */
export const NoText: TraitChipStory = { args: { trait: MANIPULATE } };

/** A slug outside the vocabulary: a plain chip with no card and no error. */
export const UnknownSlug: TraitChipStory = { args: { trait: NOT_A_TRAIT } };

/** A value trait is its own entry; the chip and its card carry the value. */
export const ValueTrait: TraitChipStory = { args: { trait: DEADLY_D8 } };

/** The producer's label wins over the entry's name. */
export const Labelled: TraitChipStory = { args: { label: 'Flame', tone: BadgeTone.Warning } };

/** The app-wide shape: the card is fetched when it first opens. */
export const Fetched: TraitChipStory = {
  decorators: [applicationConfig({ providers: [provideEntryPreviews(FETCHED_TRAIT_PREVIEWS)] })],
};

/** In a table cell, beside text. */
export const InTableCell: TraitChipStory = {
  render: (args) => ({
    props: args,
    template: `<table><tbody><tr><td>Flaming rune</td><td><pio-trait-chip [trait]="trait" /></td></tr></tbody></table>`,
  }),
};

/** In a row that wraps. */
export const WrappingRow: TraitChipStory = {
  render: () => ({
    props: { traits: [FIRE, MANIPULATE, DEADLY_D8, NOT_A_TRAIT, Trait.parse('volley-30'), Trait.parse('versatile-p')] },
    template: `<div style="display:flex;flex-wrap:wrap;gap:4px;max-width:12rem">@for (t of traits; track t) {<pio-trait-chip [trait]="t" />}</div>`,
  }),
};

/** Touch: the first tap opens the card, the second follows its link. */
export const Touch: TraitChipStory = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
