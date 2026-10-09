import { argsToTemplate } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';

import { succeedSlowly } from '../../testing/story-actions';
import type { SelectOption } from '../select/select.component';
import { Combobox } from './combobox.component';

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

export const Picked: ComboboxStory = { args: { value: 'feat-12' } };

export const Loading: ComboboxStory = { args: { options: [], loading: true } };

export const NoMatches: ComboboxStory = { args: { options: [] } };

export const Disabled: ComboboxStory = {
  args: { value: 'feat-12', disabled: true },
};
