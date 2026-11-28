import { findPropertyKind, FRONTIER_PROPERTY_KINDS, tableFromProperties } from '@pioneer/frontier/data';
import type { PropertyContext, PropertyDescriptor, TableFromPropertiesOptions } from '@pioneer/frontier/data';
import { FeatCategory, Rarity } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { ActionKind } from '../picker-cells/picker-cell-messages';
import { PrerequisiteState } from '../picker-cells/prerequisite-list/prerequisite-list.component';
import { COMMON_PROPERTIES, CommonPropertyId } from './common-properties';
import type { FeatFacts } from './feat-facts';
import { FEAT_PICKER_COLUMNS, FEAT_PROPERTIES, FeatPropertyId } from './feat-properties';
import { RULES_PROPERTY_KINDS } from './rules-property-kinds';

const CONTEXT: PropertyContext = {
  compareText: (left, right) => left.localeCompare(right),
  formatNumber: String,
  formatDate: (value) => value.toString(),
  translate: (key) => key,
};

const KINDS = new Map([...FRONTIER_PROPERTY_KINDS, ...RULES_PROPERTY_KINDS].map((kind) => [kind.id, kind]));
const OPTIONS: TableFromPropertiesOptions = { kinds: KINDS, context: CONTEXT };

function feat(overrides: Partial<FeatFacts>): FeatFacts {
  return {
    id: 'feat:power-attack',
    name: 'Power Attack',
    level: 1,
    traits: [],
    sources: [],
    category: FeatCategory.General,
    action: ActionKind.Passive,
    rarity: Rarity.Common,
    prerequisites: [],
    note: undefined,
    ...overrides,
  };
}

function property(id: string): PropertyDescriptor<FeatFacts> {
  const found = FEAT_PROPERTIES.find((candidate) => candidate.id === id);

  if (found === undefined) {
    throw new Error(`No feat property "${id}".`);
  }

  return found;
}

/** The sign of how a property's kind orders two feats. */
function order(id: string, left: FeatFacts, right: FeatFacts): number {
  const { kind, value } = property(id);

  return Math.sign(findPropertyKind(KINDS, kind).compare(value(left), value(right), CONTEXT));
}

describe('the feat properties', () => {
  it('list the eight picker columns once each, in the order the picker shows them', () => {
    expect(FEAT_PICKER_COLUMNS).toStrictEqual([
      'name',
      'level',
      'category',
      'actions',
      'traits',
      'prerequisites',
      'source',
      'notes',
    ]);
    expect(FEAT_PROPERTIES.map(({ id }) => id)).toStrictEqual(FEAT_PICKER_COLUMNS);
  });

  it('build a column for each, headed by its label', () => {
    const columns = tableFromProperties(FEAT_PROPERTIES, FEAT_PICKER_COLUMNS, OPTIONS).build();

    expect(columns.map((column) => column.header)).toStrictEqual(FEAT_PROPERTIES.map(({ label }) => label));
  });

  it('reuse the common properties, so a header, width and code are written once', () => {
    for (const common of COMMON_PROPERTIES) {
      const own = property(common.id);

      expect([own.label, own.width, own.code]).toStrictEqual([common.label, common.width, common.code]);
    }
  });

  it('give every common property the code a shared link names', () => {
    expect(COMMON_PROPERTIES.map(({ id, code }) => [id, code])).toStrictEqual([
      [CommonPropertyId.Name, 'name'],
      [CommonPropertyId.Level, 'lvl'],
      [CommonPropertyId.Traits, 'trt'],
      [CommonPropertyId.Source, 'src'],
    ]);
  });

  it('sort a feat with no level ahead of one with a level', () => {
    expect(order(FeatPropertyId.Level, feat({ level: undefined }), feat({ level: 1 }))).toBe(-1);
    expect(order(FeatPropertyId.Level, feat({ level: 10 }), feat({ level: 2 }))).toBe(1);
  });

  it('sort the cheaper action first', () => {
    expect(order(FeatPropertyId.Actions, feat({ action: ActionKind.Reaction }), feat({ action: ActionKind.Two }))).toBe(
      -1,
    );
    expect(
      order(FeatPropertyId.Actions, feat({ action: ActionKind.Passive }), feat({ action: ActionKind.Three })),
    ).toBe(1);
  });

  it('sort the feat with fewer unmet prerequisites first', () => {
    const met = feat({ prerequisites: [{ label: 'Trained in Athletics', state: PrerequisiteState.Met }] });
    const unmet = feat({ prerequisites: [{ label: 'Strength 16', state: PrerequisiteState.Unmet }] });

    expect(order(FeatPropertyId.Prerequisites, met, unmet)).toBe(-1);
    expect(order(FeatPropertyId.Prerequisites, unmet, unmet)).toBe(0);
  });

  it('read a note as text, and no note as nothing', () => {
    expect(property(FeatPropertyId.Notes).value(feat({ note: undefined }))).toBe('');
    expect(property(FeatPropertyId.Notes).value(feat({ note: 'Trains Stealth again' }))).toBe('Trains Stealth again');
  });
});
