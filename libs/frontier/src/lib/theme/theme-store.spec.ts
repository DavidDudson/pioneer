import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { ColorMode, Theme, ThemeStore } from './theme-store';

function create(): ThemeStore {
  const store = TestBed.inject(ThemeStore);
  TestBed.tick();
  return store;
}

describe(ThemeStore, () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    delete document.documentElement.dataset['mode'];
  });

  it('defaults to the frontier theme in dark mode', () => {
    const store = create();
    expect(store.theme()).toBe(Theme.Frontier);
    expect(store.mode()).toBe(ColorMode.Dark);
    expect(document.documentElement.dataset['theme']).toBe('frontier');
    expect(document.documentElement.dataset['mode']).toBe('dark');
  });

  it('applies and remembers a change', () => {
    const store = create();
    store.theme.set(Theme.Tavern);
    store.toggleMode();
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('tavern');
    expect(document.documentElement.dataset['mode']).toBe('light');
    expect(localStorage.getItem('fr-theme')).toBe('tavern');
    expect(localStorage.getItem('fr-mode')).toBe('light');
  });

  it('restores the stored choice', () => {
    localStorage.setItem('fr-theme', 'tavern');
    localStorage.setItem('fr-mode', 'light');
    const store = create();
    expect(store.theme()).toBe(Theme.Tavern);
    expect(store.mode()).toBe(ColorMode.Light);
  });

  it('ignores stored values it does not know', () => {
    localStorage.setItem('fr-theme', 'disco');
    localStorage.setItem('fr-mode', 'sepia');
    const store = create();
    expect(store.theme()).toBe(Theme.Frontier);
    expect(store.mode()).toBe(ColorMode.Dark);
  });
});
