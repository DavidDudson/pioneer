import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { FilterOperator } from '../../controls/filter-bar/filter-bar.types';
import { DateDisplay } from '../../date/date.component';
import { FRONTIER_PROPERTY_KINDS } from './property-kinds';
import { PropertyAlign, PropertyKindId } from './property.types';
import type { PropertyContext, PropertyKind } from './property.types';

const CONTEXT: PropertyContext = {
  compareText: (left, right) => left.localeCompare(right),
  formatNumber: (value) => `#${String(value)}`,
  formatDate: (value) => `on ${value.toString()}`,
  translate: (key) => `<${key}>`,
};

function kindOf(id: string): PropertyKind {
  const kind = FRONTIER_PROPERTY_KINDS.find((candidate) => candidate.id === id);

  if (kind === undefined) {
    throw new Error(`no kind ${id}`);
  }

  return kind;
}

describe('frontier property kinds', () => {
  it('ships text, number, bool and date', () => {
    expect(FRONTIER_PROPERTY_KINDS.map((kind) => kind.id)).toStrictEqual(['text', 'number', 'bool', 'date']);
  });

  it('text sorts by locale and reads as itself', () => {
    const text = kindOf(PropertyKindId.Text);
    expect(text.compare('apple', 'banana', CONTEXT)).toBeLessThan(0);
    expect(text.text('Valeros', CONTEXT)).toBe('Valeros');
    expect(text.operators).toStrictEqual([FilterOperator.Is, FilterOperator.IsNot, FilterOperator.IsAnyOf]);
    expect(text.align).toBe(PropertyAlign.Start);
  });

  it('number sorts by size, reads through the locale and lines up on the end', () => {
    const number = kindOf(PropertyKindId.Number);
    expect(number.compare(9, 10, CONTEXT)).toBeLessThan(0);
    expect(number.text(12, CONTEXT)).toBe('#12');
    expect(number.operators).toStrictEqual([FilterOperator.Is, FilterOperator.Between]);
    expect(number.align).toBe(PropertyAlign.End);
  });

  it('bool sorts false first and reads as a translated yes or no', () => {
    const bool = kindOf(PropertyKindId.Bool);
    expect(bool.compare(false, true, CONTEXT)).toBeLessThan(0);
    expect(bool.compare(true, true, CONTEXT)).toBe(0);
    expect(bool.text(true, CONTEXT)).toBe('<frontier.property.bool.yes>');
    expect(bool.text(false, CONTEXT)).toBe('<frontier.property.bool.no>');
    expect(bool.operators).toStrictEqual([FilterOperator.Is, FilterOperator.IsNot]);
  });

  it('date sorts chronologically and renders with fr-date', () => {
    const date = kindOf(PropertyKindId.Date);
    const earlier = Temporal.PlainDate.from('2026-01-02');
    const later = Temporal.PlainDate.from('2026-10-07');
    expect(date.compare(earlier, later, CONTEXT)).toBeLessThan(0);
    expect(date.text(later, CONTEXT)).toBe('on 2026-10-07');
    expect(date.cell).toBe(DateDisplay);
  });
});
