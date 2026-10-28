import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { RefreshableField } from './refreshable-field.component';

function render(): ComponentFixture<RefreshableField> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(RefreshableField);
  fixture.componentRef.setInput('label', 'Name');
  fixture.componentRef.setInput('hint', 'Rolled for you.');
  fixture.componentRef.setInput('load', async () => 'Seelah');
  fixture.detectChanges();
  return fixture;
}

describe(RefreshableField, () => {
  it('labels the input and loads its value', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('label')?.textContent.trim()).toBe('Name');
    await vi.waitFor(() => {
      expect(fixture.componentInstance.value()).toBe('Seelah');
    });
  });

  it('shows the explicit error in place of the hint', () => {
    const fixture = render();
    fixture.componentRef.setInput('error', 'Name is required.');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Name is required.');
    expect(element.textContent).not.toContain('Rolled for you.');
  });
});
