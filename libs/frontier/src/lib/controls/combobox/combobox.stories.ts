import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';
import { expect, waitFor, within } from 'storybook/test';

import { succeedSlowly } from '../../testing/story-actions';
import { pressKeys } from '../../testing/story-keyboard';
import type { SelectOption } from '../select/select.component';
import { Combobox } from './combobox.component';
import type { ComboboxOption } from './combobox.component';

type ComboboxStory = StoryObj<Combobox<string>>;

const FEAT_COUNT = 400;

const FEATS: readonly SelectOption<string>[] = Array.from({ length: FEAT_COUNT }, (_entry, index) => ({
  value: `feat-${index + 1}`,
  label: `Feat ${index + 1}`,
}));

function matching(query: string): readonly SelectOption<string>[] {
  const needle = query.trim().toLowerCase();
  return FEATS.filter((feat) => feat.label.toLowerCase().includes(needle));
}

/**
 * Pick one of hundreds by typing. The listbox opens inline below the input and is virtualised.
 * Query out, options in: the story filters on `searched` the way a feature would run its query.
 */
const meta: Meta<Combobox<string>> = {
  title: 'Controls/Combobox',
  component: Combobox,
  argTypes: {
    searched: { action: 'searched' },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: {
    options: FEATS,
    ariaLabel: 'Feat',
    placeholder: 'Search feats',
    loading: false,
    disabled: false,
    invalid: false,
  },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    template: `<fr-combobox ${argsToTemplate(args)} />`,
  }),
};
export default meta;

/** 400 options, filtered on the client. */
export const Long: ComboboxStory = {
  render: (args) => {
    const options = signal(FEATS);
    return {
      props: {
        ...args,
        options,
        search: (query: string): void => {
          options.set(matching(query));
        },
      },
      template: `<fr-combobox [ariaLabel]="ariaLabel" [placeholder]="placeholder" [options]="options()" (searched)="search($event)" />`,
    };
  },
};

/** Each query loads slowly, showing skeleton rows meanwhile. */
export const AsyncSource: ComboboxStory = {
  render: (args) => {
    const options = signal<readonly SelectOption<string>[]>([]);
    const loading = signal(false);
    return {
      props: {
        ...args,
        options,
        loading,
        search: async (query: string): Promise<void> => {
          loading.set(true);
          await succeedSlowly();
          options.set(matching(query));
          loading.set(false);
        },
      },
      template: `<fr-combobox [ariaLabel]="ariaLabel" [placeholder]="placeholder" [options]="options()" [loading]="loading()" (searched)="search($event)" />`,
    };
  },
};

const DESCRIBED: readonly ComboboxOption<string>[] = [
  { value: 'power-attack', label: 'Power Attack' },
  {
    value: 'sudden-charge',
    label: 'Sudden Charge',
    description: 'Prerequisites not met: expert in Athletics',
    disabled: true,
  },
  {
    value: 'reactive-shield',
    label: 'Reactive Shield',
    description: "Prerequisites can't be checked: an animal companion",
  },
];

/** Options that say more under their label; one is shown but can't be picked, saying why. Opened, so axe sees them. */
export const Described: ComboboxStory = {
  args: { options: DESCRIBED },
  play: async ({ canvasElement, userEvent }) => {
    const input = within(canvasElement).getByRole('combobox');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(async () => {
      await expect(within(canvasElement).getByRole('option', { name: /Sudden Charge/u })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
  },
};

/**
 * Keyboard: the arrow keys reach a disabled option, so its description is read out, and Enter on it picks nothing.
 * Runs only in `nx test-storybook frontier`.
 */
export const DescribedKeyboard: ComboboxStory = {
  // Real key presses need the Vitest runner (testing/story-keyboard.ts), so this story is test-only.
  tags: ['!dev'],
  args: { options: DESCRIBED },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');
    await userEvent.click(input);
    // One key at a time: a second press before the listbox has highlighted its first option is lost.
    await pressKeys('{ArrowDown}');
    const first = await canvas.findByRole('option', { name: /Power Attack/u });
    await waitFor(async () => {
      await expect(input).toHaveAttribute('aria-activedescendant', first.id);
    });
    await pressKeys('{ArrowDown}');
    const blocked = await canvas.findByRole('option', { name: /Sudden Charge/u });
    await waitFor(async () => {
      await expect(input).toHaveAttribute('aria-activedescendant', blocked.id);
    });
    await pressKeys('{Enter}');
    await expect(input).toHaveValue('');
  },
};

export const Picked: ComboboxStory = { args: { value: 'feat-12' } };

export const WithQuery: ComboboxStory = { args: { query: 'feat' } };

export const Loading: ComboboxStory = { args: { options: [], loading: true } };

export const NoMatches: ComboboxStory = { args: { options: [] } };

export const Disabled: ComboboxStory = {
  args: { value: 'feat-12', disabled: true },
};
