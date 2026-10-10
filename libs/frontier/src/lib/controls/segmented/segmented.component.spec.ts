import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Segmented } from './segmented.component';

function render(value: string | undefined): ComponentFixture<Segmented<string>> {
  const fixture = TestBed.createComponent(Segmented<string>);
  fixture.componentRef.setInput('options', [
    { value: 'feet', label: 'Feet' },
    { value: 'metres', label: 'Metres' },
  ]);
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('ariaLabel', 'Unit');
  fixture.detectChanges();
  return fixture;
}

function buttons(fixture: ComponentFixture<Segmented<string>>): HTMLButtonElement[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
}

describe(Segmented, () => {
  it('marks only the chosen option as pressed', () => {
    const fixture = render('metres');
    expect(buttons(fixture).map((button) => button.getAttribute('aria-pressed'))).toStrictEqual(['false', 'true']);
  });

  it('labels the group', () => {
    const fixture = render(undefined);
    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');
    expect(group?.getAttribute('aria-label')).toBe('Unit');
  });

  it('picks an option and commits', () => {
    const fixture = render('feet');
    let commits = 0;
    fixture.componentInstance.committed.subscribe(() => {
      commits += 1;
    });
    buttons(fixture)[1]?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('metres');
    expect(commits).toBe(1);
  });

  it('ignores a press on the chosen option', () => {
    const fixture = render('feet');
    let commits = 0;
    fixture.componentInstance.committed.subscribe(() => {
      commits += 1;
    });
    buttons(fixture)[0]?.click();
    expect(fixture.componentInstance.value()).toBe('feet');
    expect(commits).toBe(0);
  });

  it('makes the chosen option the only tab stop', () => {
    const fixture = render('metres');
    expect(buttons(fixture).map((button) => button.getAttribute('tabindex'))).toStrictEqual(['-1', '0']);
  });

  it('moves focus with the arrow keys without picking', () => {
    const fixture = render('feet');
    const [feet, metres] = buttons(fixture);
    feet?.focus();
    feet?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(metres);
    expect(fixture.componentInstance.value()).toBe('feet');
  });

  it('announces an invalid group', () => {
    const fixture = render(undefined);
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');
    expect(group?.getAttribute('aria-invalid')).toBe('true');
  });
});
