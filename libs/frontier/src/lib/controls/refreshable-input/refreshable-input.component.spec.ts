import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { RefreshableInput } from './refreshable-input.component';

type Load = () => Promise<string>;

/** A load that answers each call from the next of `answers`, in order. */
function loadingFrom(answers: ReadonlyArray<Promise<string>>): Load {
  const remaining = [...answers];

  return async () => remaining.splice(0, 1)[0] ?? Promise.reject(new Error('No answer left'));
}

function render(load: Load): ComponentFixture<RefreshableInput> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(RefreshableInput);
  fixture.componentRef.setInput('ariaLabel', 'Name');
  fixture.componentRef.setInput('load', load);
  fixture.detectChanges();

  return fixture;
}

function element(fixture: ComponentFixture<RefreshableInput>, selector: string): HTMLElement {
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  const found = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);

  if (found === null) {
    throw new Error(`Expected ${selector}`);
  }

  return found;
}

describe(RefreshableInput, () => {
  it('loads when it appears and turns the border of the input meanwhile', async () => {
    const pending = Promise.withResolvers<string>();
    const fixture = render(loadingFrom([pending.promise]));
    expect(element(fixture, 'fr-text-input').dataset['status']).toBe('pending');
    pending.resolve('Seelah');
    await vi.waitFor(() => {
      expect(fixture.componentInstance.value()).toBe('Seelah');
    });
    fixture.detectChanges();
    // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
    expect(element(fixture, 'fr-text-input').dataset['status']).toBeUndefined();
  });

  it('flashes the border red when a load fails, and clears it on the next load', async () => {
    const failure = Promise.reject(new Error('load failed'));
    const fixture = render(loadingFrom([failure, Promise.resolve('Seelah')]));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element(fixture, 'fr-text-input').dataset['status']).toBe('error');
    });
    await fixture.componentInstance.refresh();
    fixture.detectChanges();
    expect(element(fixture, 'fr-text-input').dataset['status']).toBeUndefined();
  });

  it('loads again when refresh is pressed', async () => {
    const fixture = render(loadingFrom([Promise.resolve('Seelah'), Promise.resolve('Amiri')]));
    await vi.waitFor(() => {
      expect(fixture.componentInstance.value()).toBe('Seelah');
    });
    fixture.detectChanges();
    element(fixture, 'fr-button button').click();
    await vi.waitFor(() => {
      expect(fixture.componentInstance.value()).toBe('Amiri');
    });
  });

  it('drops the answer of a load that a newer one overtook', async () => {
    const older = Promise.withResolvers<string>();
    const newer = Promise.withResolvers<string>();
    const fixture = render(loadingFrom([older.promise, newer.promise]));
    const refreshing = fixture.componentInstance.refresh();
    newer.resolve('Newer');
    await refreshing;
    older.resolve('Older');
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('Newer');
  });

  it('marks the input invalid when a load fails and keeps the value', async () => {
    const failing = Promise.withResolvers<string>();
    const fixture = render(loadingFrom([failing.promise]));
    fixture.componentRef.setInput('value', 'Kept');
    failing.reject(new Error('load failed'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element(fixture, 'input').getAttribute('aria-invalid')).toBe('true');
    });
    expect(fixture.componentInstance.value()).toBe('Kept');
  });
});
