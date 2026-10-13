import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';
import { expect, waitFor, within } from 'storybook/test';
import * as z from 'zod';

import { InlineEdit } from '../../inline-edit/inline-edit';
import { InlineField } from '../../inline-edit/inline-field/inline-field.component';
import { succeedSlowly } from '../../testing/story-actions';
import { pressKeys } from '../../testing/story-keyboard';
import { COLUMNS, FEATS, FeatServer } from './picker-story-server';
import type { Feat } from './picker-story-server';
import { Picker } from './picker.component';

type PickerStory = StoryObj<Picker<string, Feat>>;

const FEW: readonly Feat[] = FEATS.slice(0, 6);
const PICKED = 'feat-2';
const FUNCTION_INPUTS: (keyof Picker<string, Feat>)[] = ['rowValue', 'rowLabel', 'rowDisabled'];

/**
 * Pick one row of a table. The panel opens inline below the trigger, with a search box and sortable columns.
 * Everything the rows depend on is the caller's: `searched`, `sorted` and `loadMore` go out, rows come back.
 */
const meta: Meta<Picker<string, Feat>> = {
  title: 'Controls/Picker',
  component: Picker,
  decorators: [moduleMetadata({ imports: [InlineField] })],
  argTypes: {
    rows: { control: false },
    columns: { control: false },
    rowValue: { control: false },
    rowLabel: { control: false },
    rowDisabled: { control: false },
    searched: { action: 'searched' },
    sorted: { action: 'sorted' },
    loadMore: { action: 'loadMore' },
    committed: { action: 'committed' },
    cancelled: { action: 'cancelled' },
  },
  args: {
    rows: FEW,
    columns: COLUMNS,
    rowValue: (feat: Feat): string => feat.id,
    rowLabel: (feat: Feat): string => feat.name,
    rowDisabled: (feat: Feat): string | undefined => feat.locked,
    ariaLabel: 'Feat',
    loading: false,
    loadingMore: false,
    hasMore: false,
    disabled: false,
    invalid: false,
  },
  parameters: { layout: 'padded' },
  render: (args) => ({
    props: args,
    // `argsToTemplate` turns a function arg into an output binding, so the row functions are bound by hand.
    template: `<fr-picker ${argsToTemplate(args, { exclude: FUNCTION_INPUTS })} [rowValue]="rowValue" [rowLabel]="rowLabel" [rowDisabled]="rowDisabled" />`,
  }),
};
export default meta;

const OPEN: NonNullable<PickerStory['play']> = async ({ canvasElement, userEvent }) => {
  await userEvent.click(within(canvasElement).getByRole('button'));
};

export const Closed: PickerStory = {};

export const Picked: PickerStory = { args: { value: PICKED } };

/** Opened, so axe sees the grid. The fourth feat is shown but can't be picked, and says why. */
export const Open: PickerStory = {
  play: async (context) => {
    await OPEN(context);
    const canvas = within(context.canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByRole('grid')).toBeVisible();
    });
    await expect(canvas.getAllByText('Needs expert in Athletics')).toHaveLength(1);
  },
};

export const Loading: PickerStory = { args: { rows: [], loading: true }, play: OPEN };

export const NoMatches: PickerStory = { args: { rows: [] }, play: OPEN };

export const Disabled: PickerStory = { args: { value: PICKED, disabled: true } };

export const Invalid: PickerStory = { args: { invalid: true } };

/**
 * 400 feats on a pretend server, 25 at a time. Searching and sorting start over from the top; scrolling near the
 * end loads the next 25, with skeleton rows meanwhile. The panel is virtualised, so it stays cheap.
 */
export const ScrollToLoadMore: PickerStory = {
  render: (args) => ({
    props: { ...args, server: new FeatServer() },
    template: `
      <fr-picker
        ariaLabel="Feat"
        [columns]="columns"
        [rowValue]="rowValue"
        [rowLabel]="rowLabel"
        [rowDisabled]="rowDisabled"
        [rows]="server.rows()"
        [loading]="server.loading()"
        [loadingMore]="server.loadingMore()"
        [hasMore]="server.hasMore()"
        (searched)="server.search($event)"
        (sorted)="server.sort($event)"
        (loadMore)="server.more()"
      />
    `,
  }),
};

/** The picker as an inline editor: a pick commits and saves at once. */
export const InlineEditor: PickerStory = {
  render: (args) => {
    const source = signal<string | undefined>(PICKED);
    const edit = new InlineEdit<string>({
      source,
      empty: '',
      schema: z.string(),
      save: async (value: string): Promise<void> => {
        await succeedSlowly();
        source.set(value);
      },
    });
    return {
      props: { ...args, edit },
      template: `
        <fr-inline-field label="Feat" [edit]="edit">
          <fr-picker
            frInlineEditor
            ariaLabel="Feat"
            [columns]="columns"
            [rowValue]="rowValue"
            [rowLabel]="rowLabel"
            [rowDisabled]="rowDisabled"
            [rows]="rows"
            [value]="edit.draft()"
            (valueChange)="edit.change($event)"
            (committed)="edit.flushSoon()"
            (cancelled)="edit.cancel()"
          />
        </fr-inline-field>
      `,
    };
  },
};

/**
 * One key at a time: a second press before the grid has highlighted a cell is lost. The first row starts
 * highlighted, so three presses reach the fourth, which is locked.
 */
async function highlightFourth(canvasElement: HTMLElement, search: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);
  await pressKeys('{ArrowDown}');
  await pressKeys('{ArrowDown}');
  await pressKeys('{ArrowDown}');
  const locked = await canvas.findByRole('gridcell', { name: /Feat 4/u });
  await waitFor(async () => {
    await expect(search).toHaveAttribute('aria-activedescendant', locked.id);
  });
}

/**
 * Keyboard: focus lands in the search box, the arrow keys move the highlight (reaching a locked row, so its
 * reason is read out), Enter on a free row picks it and puts focus back on the trigger.
 * Runs only in `nx test-storybook frontier`.
 */
export const Keyboard: PickerStory = {
  // Real key presses need the Vitest runner (testing/story-keyboard.ts), so this story is test-only.
  tags: ['!dev'],
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button');
    await userEvent.click(trigger);
    const search = await canvas.findByRole('combobox');
    await waitFor(async () => {
      await expect(search).toHaveFocus();
    });
    await highlightFourth(canvasElement, search);
    await pressKeys('{Enter}');
    await expect(trigger).toHaveTextContent('Select…');
    await pressKeys('{ArrowUp}');
    await pressKeys('{Enter}');
    await waitFor(async () => {
      await expect(trigger).toHaveTextContent('Feat 3');
    });
    await expect(trigger).toHaveFocus();
  },
};
