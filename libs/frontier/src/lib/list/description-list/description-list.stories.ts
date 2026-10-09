import { argsToTemplate, moduleMetadata } from '@analogjs/storybook-angular';
import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { signal } from '@angular/core';
import { z } from 'zod';

import { NumberInput } from '../../controls/number-input/number-input.component';
import { InlineEdit } from '../../inline-edit/inline-edit';
import { InlineField } from '../../inline-edit/inline-field/inline-field.component';
import { Disclosure } from '../../layout/disclosure/disclosure.component';
import { Stack } from '../../layout/stack/stack.component';
import { succeedSlowly } from '../../testing/story-actions';
import { Text } from '../../text/text/text.component';
import { Container, Space } from '../../tokens';
import { DescriptionItem } from '../description-item/description-item.component';
import { DescriptionList } from './description-list.component';

type DescriptionListStory = StoryObj<DescriptionList>;

const LEVEL = z.number().int().min(1).max(20);

function levelEdit(initial: number): InlineEdit<number> {
  const source = signal<number | undefined>(initial);
  return new InlineEdit<number>({
    source,
    empty: 0,
    schema: LEVEL,
    save: async (value): Promise<void> => {
      await succeedSlowly();
      source.set(value);
    },
  });
}

/** Labelled values: stacked when narrow, term and value columns once wide. Resize the canvas to see it switch. */
const meta: Meta<DescriptionList> = {
  title: 'Lists/Description List',
  component: DescriptionList,
  subcomponents: { DescriptionItem },
  decorators: [moduleMetadata({ imports: [DescriptionItem, Disclosure, InlineField, NumberInput, Stack, Text] })],
  argTypes: {
    gap: { control: 'select', options: Object.values(Space) },
    columnsFrom: { control: 'inline-radio', options: Object.values(Container) },
  },
  args: { gap: Space.Xs, columnsFrom: Container.Sm },
  render: (args) => ({
    props: args,
    template: `
      <fr-description-list ${argsToTemplate(args)}>
        <fr-description-item term="Armor Class"><fr-text numeric>18</fr-text></fr-description-item>
        <fr-description-item term="Perception"><fr-text numeric>+7</fr-text></fr-description-item>
        <fr-description-item term="Speed"><fr-text>25 feet</fr-text></fr-description-item>
        <fr-description-item term="Languages">
          <fr-text>Common, Dwarven, Sakvroth, and one more language from your Intelligence modifier</fr-text>
        </fr-description-item>
      </fr-description-list>
    `,
  }),
};
export default meta;

export const Plain: DescriptionListStory = {};

/** Rows switch to columns only from the `md` container size. */
export const ColumnsFromMedium: DescriptionListStory = { args: { columnsFrom: Container.Md } };

/** A value that expands in place to show its breakdown. */
export const WithDisclosure: DescriptionListStory = {
  render: () => ({
    template: `
      <fr-description-list>
        <fr-description-item term="Armor Class"><fr-text numeric>18</fr-text></fr-description-item>
        <fr-description-item term="Fortitude">
          <fr-disclosure>
            <fr-text frDisclosureSummary>+9</fr-text>
            <fr-stack gap="2xs">
              <fr-text tone="muted">+3 Constitution</fr-text>
              <fr-text tone="muted">+6 expert proficiency</fr-text>
            </fr-stack>
          </fr-disclosure>
        </fr-description-item>
        <fr-description-item term="Reflex">
          <fr-disclosure>
            <fr-text frDisclosureSummary>+7</fr-text>
            <fr-text tone="muted">+3 Dexterity, +4 trained proficiency</fr-text>
          </fr-disclosure>
        </fr-description-item>
      </fr-description-list>
    `,
  }),
};

/** A value edited in place: tap it to edit, it saves itself. */
export const WithInlineField: DescriptionListStory = {
  render: () => ({
    props: { level: levelEdit(3) },
    template: `
      <fr-description-list>
        <fr-description-item term="Ancestry"><fr-text>Dwarf</fr-text></fr-description-item>
        <fr-description-item term="Level">
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
        </fr-description-item>
      </fr-description-list>
    `,
  }),
};
