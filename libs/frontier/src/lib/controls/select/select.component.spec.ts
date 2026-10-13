import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTranslocoScope } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Select } from './select.component';

function render(scoped: boolean): ComponentFixture<Select<string>> {
  TestBed.configureTestingModule({
    providers: [
      ...provideFrontierI18nTesting(),
      // A feature route's scope, as the character routes provide one.
      ...(scoped ? [provideTranslocoScope({ scope: 'feature', loader: { en: async () => ({}) } })] : []),
    ],
  });
  const fixture = TestBed.createComponent(Select<string>);
  fixture.componentRef.setInput('options', [{ value: 'elf', label: 'Elf' }]);
  return fixture;
}

function trigger(fixture: ComponentFixture<Select<string>>): string {
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('button')?.textContent.trim() ?? '';
}

describe(Select, () => {
  it('shows the default placeholder in the active locale', async () => {
    const fixture = render(false);
    await vi.waitFor(() => {
      expect(trigger(fixture)).toContain('Select…');
    });
  });

  it('renders an option description beside its label, and none for an option without one', async () => {
    const fixture = render(false);
    fixture.componentRef.setInput('options', [
      { value: 'elf', label: 'Elf', description: 'Already trained in Religion' },
      { value: 'dwarf', label: 'Dwarf' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    fixture.detectChanges();
    await vi.waitFor(() => {
      const options = [...document.body.querySelectorAll('[role="option"]')];
      expect(options.map((option) => option.querySelectorAll('span').length)).toStrictEqual([1, 0]);
      expect(options[0]?.textContent).toContain('Already trained in Religion');
    });
  });

  it('shows the default placeholder inside a feature message scope, not a scoped key', async () => {
    const fixture = render(true);
    await vi.waitFor(() => {
      expect(trigger(fixture)).toContain('Select…');
    });
    expect(trigger(fixture)).not.toContain('frontier.select.placeholder');
  });
});
