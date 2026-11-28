import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { moduleMetadata } from '@analogjs/storybook-angular';
import { Temporal } from '@pioneer/shared/kernel';

import { Stack } from '../../layout/stack/stack.component';
import { PropertyCell } from './property-cell.component';
import { PropertyKindId } from './property.types';
import type { PropertyDescriptor } from './property.types';

interface Hero {
  readonly name: string;
  readonly level: number;
  readonly active: boolean;
  readonly joined: Temporal.PlainDate;
}

const VALEROS: Hero = {
  name: 'Valeros',
  level: 1234,
  active: true,
  joined: Temporal.PlainDate.from('2026-10-07'),
};

const BASE = { id: 'story', label: 'story.label' } as const;

const TEXT: PropertyDescriptor<Hero> = { ...BASE, kind: PropertyKindId.Text, value: (hero) => hero.name };
const NUMBER: PropertyDescriptor<Hero> = { ...BASE, kind: PropertyKindId.Number, value: (hero) => hero.level };
const BOOL: PropertyDescriptor<Hero> = { ...BASE, kind: PropertyKindId.Bool, value: (hero) => hero.active };
const DATE: PropertyDescriptor<Hero> = { ...BASE, kind: PropertyKindId.Date, value: (hero) => hero.joined };

type PropertyCellStory = StoryObj<PropertyCell<Hero>>;

/** One property of one entity as a cell. The kind in the descriptor decides how it reads, sorts and aligns. */
const meta: Meta<PropertyCell<Hero>> = {
  title: 'Data/PropertyCell',
  component: PropertyCell,
  decorators: [moduleMetadata({ imports: [Stack] })],
  argTypes: { property: { control: false }, entity: { control: false } },
  args: { property: TEXT, entity: VALEROS },
  render: (args) => ({
    props: args,
    template: `<fr-property-cell [property]="property" [entity]="entity" />`,
  }),
};

export default meta;

export const Text: PropertyCellStory = {};

export const Number: PropertyCellStory = { args: { property: NUMBER } };

export const Bool: PropertyCellStory = { args: { property: BOOL } };

export const Date: PropertyCellStory = { args: { property: DATE } };
