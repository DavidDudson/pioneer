import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { ColorMode, ModeChoice, Theme, ThemeChoice } from './theme';
import { ThemeStore } from './theme-store';

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

  it('defaults to the dynamic theme, which is frontier without a context, in dark mode', () => {
    const store = create();
    expect(store.theme()).toBe(Theme.Frontier);
    expect(store.mode()).toBe(ColorMode.Dark);
    expect(document.documentElement.dataset['theme']).toBe('frontier');
    expect(document.documentElement.dataset['mode']).toBe('dark');
  });

  it('applies and remembers a change', () => {
    const store = create();
    store.modeChoice.set(ColorMode.Light);
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('frontier');
    expect(document.documentElement.dataset['mode']).toBe('light');
    expect(localStorage.getItem('fr-theme')).toBe('dynamic');
    expect(localStorage.getItem('fr-mode')).toBe('light');
  });

  it('restores the stored choice', () => {
    localStorage.setItem('fr-theme', 'frontier');
    localStorage.setItem('fr-mode', 'light');
    const store = create();
    expect(store.choice()).toBe(ThemeChoice.Frontier);
    expect(store.mode()).toBe(ColorMode.Light);
  });

  it('ignores stored values it does not know', () => {
    localStorage.setItem('fr-theme', 'disco');
    localStorage.setItem('fr-mode', 'sepia');
    const store = create();
    expect(store.theme()).toBe(Theme.Frontier);
    expect(store.mode()).toBe(ColorMode.Dark);
  });

  it('follows the context theme while dynamic, and ignores it for a fixed pick', () => {
    const store = create();
    store.context.set(Theme.Frontier);
    expect(store.theme()).toBe(Theme.Frontier);
    store.choice.set(Theme.Frontier);
    expect(store.theme()).toBe(Theme.Frontier);
    store.choice.set(ThemeChoice.Dynamic);
    store.context.set(undefined);
    expect(store.theme()).toBe(Theme.Frontier);
  });

  it('follows the device for the system mode', () => {
    const store = create();
    store.modeChoice.set(ModeChoice.System);
    TestBed.tick();
    expect(localStorage.getItem('fr-mode')).toBe('system');
    expect([ColorMode.Dark, ColorMode.Light]).toContain(store.mode());
  });
});
