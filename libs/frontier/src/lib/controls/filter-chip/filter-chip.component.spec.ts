import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { FilterOperator } from '../filter-bar/filter-bar.types';
import { FilterChip, FilterChipSegment } from './filter-chip.component';

interface Inputs {
  readonly value?: string;
  readonly operator?: FilterOperator;
  readonly expanded?: boolean;
}

function render(inputs: Inputs = {}): ComponentFixture<FilterChip> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(FilterChip);
  fixture.componentRef.setInput('property', 'Rarity');
  fixture.componentRef.setInput('value', inputs.value ?? 'Rare');
  fixture.componentRef.setInput('operator', inputs.operator ?? FilterOperator.Is);
  fixture.componentRef.setInput('expanded', inputs.expanded ?? false);
  fixture.componentRef.setInput('controls', 'rarity-editor');
  fixture.detectChanges();

  return fixture;
}

function host(fixture: ComponentFixture<FilterChip>): HTMLElement {
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return fixture.nativeElement as HTMLElement;
}

function buttons(fixture: ComponentFixture<FilterChip>): Array<HTMLButtonElement> {
  return [...host(fixture).querySelectorAll('button')];
}

describe(FilterChip, () => {
  it('is a group named by one phrase per operator', () => {
    const phrases = [
      [FilterOperator.Is, 'Rarity is Rare'],
      [FilterOperator.IsNot, 'Rarity is not Rare'],
      [FilterOperator.IsAnyOf, 'Rarity is any of Rare'],
      [FilterOperator.Between, 'Rarity is between Rare'],
    ] as const;

    for (const [operator, phrase] of phrases) {
      TestBed.resetTestingModule();
      const group = host(render({ operator }));

      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe(phrase);
    }
  });

  it('is one control-size token tall', () => {
    expect(host(render()).classList).toContain('h-control-sm');
  });

  it('exposes aria-expanded and aria-controls on each editing segment', () => {
    const [property, operator, value] = buttons(render({ expanded: true }));

    for (const segment of [property, operator, value]) {
      expect(segment?.getAttribute('aria-expanded')).toBe('true');
      expect(segment?.getAttribute('aria-controls')).toBe('rarity-editor');
    }
  });

  it('opens the editor on the segment pressed', () => {
    const fixture = render();
    const pressed: Array<FilterChipSegment> = [];
    fixture.componentInstance.edit.subscribe((segment) => {
      pressed.push(segment);
    });

    for (const segment of buttons(fixture).slice(0, 3)) {
      segment.click();
    }

    expect(pressed).toStrictEqual([FilterChipSegment.Property, FilterChipSegment.Operator, FilterChipSegment.Value]);
  });

  it('removes from the cross and from Backspace', () => {
    const fixture = render();
    let removals = 0;
    fixture.componentInstance.removed.subscribe(() => {
      removals += 1;
    });

    buttons(fixture).at(-1)?.click();
    buttons(fixture)[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));

    expect(removals).toBe(2);
  });

  it('drops a draft when focus leaves with no editor open', () => {
    const fixture = render({ value: '' });
    let drops = 0;
    fixture.componentInstance.dropped.subscribe(() => {
      drops += 1;
    });

    host(fixture).dispatchEvent(new FocusEvent('focusout', {}));

    expect(drops).toBe(1);
  });

  it('keeps a draft while its editor is open, and a chip with a value', () => {
    for (const inputs of [{ value: '', expanded: true }, { value: 'Rare' }]) {
      TestBed.resetTestingModule();
      const fixture = render(inputs);
      let drops = 0;
      fixture.componentInstance.dropped.subscribe(() => {
        drops += 1;
      });

      host(fixture).dispatchEvent(new FocusEvent('focusout', {}));

      expect(drops).toBe(0);
    }
  });

  it('keeps a draft while focus moves between its own segments', () => {
    const fixture = render({ value: '' });
    let drops = 0;
    fixture.componentInstance.dropped.subscribe(() => {
      drops += 1;
    });

    const operator = host(fixture).querySelectorAll('button').item(1);
    host(fixture).dispatchEvent(new FocusEvent('focusout', { relatedTarget: operator }));

    expect(drops).toBe(0);
  });
});
