import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { SEARCH_DEBOUNCE, SearchInput } from './search-input.component';

interface Rendered {
  readonly fixture: ComponentFixture<SearchInput>;
  readonly input: HTMLInputElement;
  /** Every query `searched` fired, in order. */
  readonly searches: string[];
  readonly commits: () => number;
  readonly cancels: () => number;
}

function render(value = ''): Rendered {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(SearchInput);
  fixture.componentRef.setInput('ariaLabel', 'Search feats');
  fixture.componentRef.setInput('value', value);
  const searches: string[] = [];
  let commits = 0;
  let cancels = 0;
  fixture.componentInstance.searched.subscribe((query) => {
    searches.push(query);
  });
  fixture.componentInstance.committed.subscribe(() => {
    commits += 1;
  });
  fixture.componentInstance.cancelled.subscribe(() => {
    cancels += 1;
  });
  fixture.detectChanges();
  const input = (fixture.nativeElement as HTMLElement).querySelector('input');
  if (input === null) {
    throw new Error('Expected an input');
  }
  return { fixture, input, searches, commits: (): number => commits, cancels: (): number => cancels };
}

function type(rendered: Rendered, text: string): void {
  rendered.input.value = text;
  rendered.input.dispatchEvent(new Event('input'));
  rendered.fixture.detectChanges();
}

function press(rendered: Rendered, key: 'Enter' | 'Escape'): void {
  rendered.input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  rendered.fixture.detectChanges();
}

function clearButton(rendered: Rendered): HTMLButtonElement | null {
  return (rendered.fixture.nativeElement as HTMLElement).querySelector('button');
}

describe(SearchInput, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is a labelled search box', () => {
    const { input } = render();
    expect(input.type).toBe('search');
    expect(input.getAttribute('aria-label')).toBe('Search feats');
  });

  it('follows every keystroke in value but searches once typing goes quiet', () => {
    const rendered = render();
    type(rendered, 'Pow');
    type(rendered, 'Power');
    expect(rendered.fixture.componentInstance.value()).toBe('Power');
    vi.advanceTimersByTime(SEARCH_DEBOUNCE - 1);
    expect(rendered.searches).toStrictEqual([]);
    vi.advanceTimersByTime(1);
    expect(rendered.searches).toStrictEqual(['Power']);
  });

  it('searches at once on Enter and commits', () => {
    const rendered = render();
    type(rendered, 'Power');
    press(rendered, 'Enter');
    expect(rendered.searches).toStrictEqual(['Power']);
    expect(rendered.commits()).toBe(1);
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);
    expect(rendered.searches).toStrictEqual(['Power']);
  });

  it('clears on Escape, searches for nothing and cancels', () => {
    const rendered = render();
    type(rendered, 'Power');
    press(rendered, 'Escape');
    expect(rendered.fixture.componentInstance.value()).toBe('');
    expect(rendered.input.value).toBe('');
    expect(rendered.searches).toStrictEqual(['']);
    expect(rendered.cancels()).toBe(1);
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);
    expect(rendered.searches).toStrictEqual(['']);
  });

  it('shows a labelled clear button only while there is a query', () => {
    const rendered = render();
    expect(clearButton(rendered)).toBeNull();
    type(rendered, 'Power');
    expect(clearButton(rendered)?.getAttribute('aria-label')).toBe('Clear search');
  });

  it('clears from the button, searches for nothing and puts focus back in the input', () => {
    const rendered = render('Power');
    clearButton(rendered)?.click();
    rendered.fixture.detectChanges();
    expect(rendered.fixture.componentInstance.value()).toBe('');
    expect(rendered.searches).toStrictEqual(['']);
    expect(rendered.cancels()).toBe(0);
    expect(document.activeElement).toBe(rendered.input);
    expect(clearButton(rendered)).toBeNull();
  });

  it('does not search when the value is set from outside', () => {
    const rendered = render();
    rendered.fixture.componentRef.setInput('value', 'Power');
    rendered.fixture.detectChanges();
    vi.advanceTimersByTime(SEARCH_DEBOUNCE);
    expect(rendered.searches).toStrictEqual([]);
  });

  it('has no clear button while disabled', () => {
    const rendered = render('Power');
    rendered.fixture.componentRef.setInput('disabled', true);
    rendered.fixture.detectChanges();
    expect(clearButton(rendered)).toBeNull();
  });
});
