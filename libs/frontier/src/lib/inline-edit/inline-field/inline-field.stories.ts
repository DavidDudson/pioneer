import { moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import * as z from 'zod';

import { NumberInput } from '../../controls/number-input/number-input.component';
import { TextInput } from '../../controls/text-input/text-input.component';
import { Grid } from '../../layout/grid/grid.component';
import { failSlowly, succeedSlowly } from '../../testing/story-actions';
import { InlineEdit } from '../inline-edit';
import { SaveStatus } from '../save-status/save-status.component';
import { InlineField } from './inline-field.component';

type InlineFieldStory = StoryObj<InlineField<string>>;

const LEVEL = z.number().int().min(1).max(20);
const NAME = z.string().trim().min(1);

class ConflictError extends Error {
  public override readonly name = 'ConflictError';
}

/** A save that behaves like a store: after the latency the server value becomes the saved one. */
function savingTo<TValue>(source: WritableSignal<TValue | undefined>): (value: TValue) => Promise<void> {
  return async (value) => {
    await succeedSlowly();
    source.set(value);
  };
}

function nameEdit(initial: string | undefined, save?: (value: string) => Promise<void>): InlineEdit<string> {
  const source = signal(initial);
  return new InlineEdit<string>({
    source,
    empty: '',
    schema: NAME,
    save: save ?? savingTo(source),
    isConflict: (error): boolean => error instanceof ConflictError,
  });
}

function levelEdit(initial: number): InlineEdit<number> {
  const source = signal<number | undefined>(initial);
  return new InlineEdit<number>({ source, empty: 0, schema: LEVEL, save: savingTo(source) });
}

const NAME_FIELD = `
  <fr-inline-field label="Name" [edit]="name">
    <fr-text-input
      frInlineEditor
      ariaLabel="Name"
      [value]="name.draft()"
      (valueChange)="name.change($event)"
      (committed)="name.flushSoon()"
      (cancelled)="name.cancel()"
    />
  </fr-inline-field>
`;

/**
 * Tap the value to edit it. Changes save 600ms after the last keystroke (or
 * at once on Enter or blur), then show "Saved" with Revert for 5s. Escape
 * drops an unsaved change. There are no save or cancel buttons.
 */
const meta: Meta<InlineField<string>> = {
  title: 'Inline Edit/Inline Field',
  component: InlineField,
  subcomponents: { SaveStatus },
  decorators: [moduleMetadata({ imports: [Grid, NumberInput, TextInput] })],
  argTypes: { edit: { control: false } },
  render: () => ({ props: { name: nameEdit('Valeros') }, template: NAME_FIELD }),
};
export default meta;

export const Text: InlineFieldStory = {};

/** No server value yet: a skeleton, and the field can't be opened. */
export const Loading: InlineFieldStory = {
  render: () => ({ props: { name: nameEdit(undefined) }, template: NAME_FIELD }),
};

/** Clear the name to see the schema's message inline; invalid drafts never save. */
export const Validation: InlineFieldStory = {};

export const SaveFails: InlineFieldStory = {
  render: () => ({ props: { name: nameEdit('Valeros', failSlowly) }, template: NAME_FIELD }),
};

/** The record changed elsewhere: shows a conflict instead of overwriting. */
export const Conflict: InlineFieldStory = {
  render: () => ({
    props: {
      name: nameEdit('Valeros', async () => {
        await succeedSlowly();
        throw new ConflictError();
      }),
    },
    template: NAME_FIELD,
  }),
};

/** Each field owns its own state: loading, saving and errors are per field, not per form. */
export const SeveralFields: InlineFieldStory = {
  render: () => ({
    props: { name: nameEdit('Valeros'), level: levelEdit(3) },
    template: `
      <fr-grid [columns]="2">
        ${NAME_FIELD}
        <fr-inline-field label="Level" [edit]="level">
          <fr-number-input
            frInlineEditor
            ariaLabel="Level"
            [min]="1"
            [max]="20"
            [value]="level.draft()"
            (valueChange)="level.change($event)"
            (committed)="level.flushSoon()"
            (cancelled)="level.cancel()"
          />
        </fr-inline-field>
      </fr-grid>
    `,
  }),
};
