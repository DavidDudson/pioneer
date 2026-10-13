import type { Price } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { FeatTableSchema } from './feat-table-schema';
import { ItemTableSchema } from './item-table-schema';
import type { ActionKind } from './picker-cell-messages';
import { RulesTableSchema } from './rules-table-schema';
import { SpellTableSchema } from './spell-table-schema';

interface Row {
  readonly actions: ActionKind;
  readonly level: number;
  readonly price: Price | undefined;
  readonly met: boolean;
}

const header = 'Header';

describe('rules table schemas', () => {
  it('chains the shared steps with the generic ones', () => {
    const columns = new RulesTableSchema<Row>()
      .addText({ id: 'level-text', header, value: (row) => row.level })
      .addActions({ id: 'actions', header, value: (row) => row.actions })
      .addLevel({ id: 'level', header, value: (row) => row.level })
      .build();
    expect(columns.map((column) => column.id)).toStrictEqual(['level-text', 'actions', 'level']);
  });

  it('keeps a kind of row typed through the chain', () => {
    const spells = new SpellTableSchema<Row>().addLevel({ id: 'level', header, value: (row) => row.level });
    const feats = new FeatTableSchema<Row>().addPrerequisites({
      id: 'prerequisites',
      header,
      value: (row) => [{ label: 'Trained', met: row.met }],
    });
    const items = new ItemTableSchema<Row>().addPrice({ id: 'price', header, value: (row) => row.price });
    expect([spells, feats, items].map((schema) => schema.build().length)).toStrictEqual([1, 1, 1]);
  });

  it('builds a column per step, with the id it was given', () => {
    const columns = new SpellTableSchema<Row>()
      .addRank({ id: 'rank', header, value: (row) => row.level })
      .addTraditions({ id: 'traditions', header, value: () => [{ label: 'Arcane' }] })
      .build();
    expect(columns.map((column) => column.id)).toStrictEqual(['rank', 'traditions']);
  });
});
