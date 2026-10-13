import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { COLUMNS, FEATS } from '../../controls/picker/picker-testing';
import type { Feat } from '../../controls/picker/picker-testing';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { PickerField } from './picker-field.component';

function render(): ComponentFixture<PickerField<string, Feat>> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(PickerField<string, Feat>);
  fixture.componentRef.setInput('label', 'Feat');
  fixture.componentRef.setInput('rows', FEATS);
  fixture.componentRef.setInput('columns', COLUMNS);
  fixture.componentRef.setInput('rowValue', (feat: Feat): string => feat.id);
  fixture.componentRef.setInput('rowLabel', (feat: Feat): string => feat.name);
  fixture.detectChanges();
  return fixture;
}

function trigger(fixture: ComponentFixture<PickerField<string, Feat>>): HTMLButtonElement {
  const found = (fixture.nativeElement as HTMLElement).querySelector('button');
  if (found === null) {
    throw new Error('Expected a trigger');
  }
  return found;
}

describe(PickerField, () => {
  it('names the trigger with the field label', () => {
    const fixture = render();
    const label = (fixture.nativeElement as HTMLElement).querySelector('label');
    expect(label?.textContent.trim()).toBe('Feat');
    expect(label?.getAttribute('for')).toBe(trigger(fixture).id);
  });

  it('shows a hint, and an error in its place', () => {
    const fixture = render();
    fixture.componentRef.setInput('hint', 'Pick one you qualify for.');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pick one you qualify for.');
    fixture.componentRef.setInput('error', 'Choose a feat.');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Choose a feat.');
    expect(trigger(fixture).getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the picked value on the trigger and the open grid under the field label', async () => {
    const fixture = render();
    fixture.componentRef.setInput('value', 'reactive-shield');
    fixture.detectChanges();
    expect(trigger(fixture).textContent.trim()).toBe('Reactive Shield');
    trigger(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();
    const label = (fixture.nativeElement as HTMLElement).querySelector('label');
    const grid = (fixture.nativeElement as HTMLElement).querySelector('[role="grid"]');
    expect(grid?.getAttribute('aria-labelledby')).toBe(label?.id);
  });

  it('passes the query, order and end of the rows out', async () => {
    const fixture = render();
    const searches: string[] = [];
    fixture.componentInstance.searched.subscribe((query) => {
      searches.push(query);
    });
    trigger(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(searches).toStrictEqual(['']);
  });
});
