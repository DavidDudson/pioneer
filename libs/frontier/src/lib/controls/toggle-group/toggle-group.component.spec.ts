import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Field } from '../../forms/field/field.component';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { ToggleGroup } from './toggle-group.component';

type Rarity = 'common' | 'uncommon' | 'rare';

interface Rendered {
  readonly fixture: ComponentFixture<ToggleGroup<Rarity>>;
  readonly commits: () => number;
}

function render(selected: ReadonlyArray<Rarity>): Rendered {
  TestBed.configureTestingModule({
    providers: [...provideFrontierI18nTesting()],
  });
  const fixture = TestBed.createComponent(ToggleGroup<Rarity>);
  fixture.componentRef.setInput('options', [
    { value: 'common', label: 'Common' },
    { value: 'uncommon', label: 'Uncommon' },
    { value: 'rare', label: 'Rare' },
  ]);
  fixture.componentRef.setInput('value', new Set(selected));
  fixture.componentRef.setInput('ariaLabel', 'Rarity');
  let commits = 0;
  fixture.componentInstance.committed.subscribe(() => {
    commits += 1;
  });
  fixture.detectChanges();

  return { fixture, commits: () => commits };
}

function provideField(): void {
  // Only the members a control reads from its field.
  const field = {
    controlId: 'rarity-control',
    labelId: 'rarity-label',
    describedBy: signal('rarity-hint'),
    invalid: signal(true),
  };

  TestBed.configureTestingModule({ providers: [{ provide: Field, useValue: field }] });
}

function host(fixture: ComponentFixture<ToggleGroup<Rarity>>): HTMLElement {
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return fixture.nativeElement as HTMLElement;
}

function chips(fixture: ComponentFixture<ToggleGroup<Rarity>>): Array<HTMLButtonElement> {
  return [...host(fixture).querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];
}

function clearButton(fixture: ComponentFixture<ToggleGroup<Rarity>>): HTMLButtonElement | undefined {
  return [...host(fixture).querySelectorAll('button')].find((button) => !button.hasAttribute('aria-pressed'));
}

function pressed(fixture: ComponentFixture<ToggleGroup<Rarity>>): Array<string | null> {
  return chips(fixture).map((chip) => chip.getAttribute('aria-pressed'));
}

describe(ToggleGroup, () => {
  it('renders a toggle button per option, pressed when its key is selected', () => {
    const { fixture } = render(['uncommon', 'rare']);
    expect(chips(fixture).map((chip) => chip.textContent.trim())).toStrictEqual(['Common', 'Uncommon', 'Rare']);
    expect(pressed(fixture)).toStrictEqual(['false', 'true', 'true']);
  });

  it('labels the group', () => {
    const { fixture } = render([]);
    expect(host(fixture).querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe('Rarity');
  });

  it('adds a key on press and commits a new set', () => {
    const { fixture, commits } = render(['common']);
    const before = fixture.componentInstance.value();
    chips(fixture)[2]?.click();
    fixture.detectChanges();
    expect([...fixture.componentInstance.value()]).toStrictEqual(['common', 'rare']);
    expect(fixture.componentInstance.value()).not.toBe(before);
    expect(before.has('rare')).toBe(false);
    expect(pressed(fixture)).toStrictEqual(['true', 'false', 'true']);
    expect(commits()).toBe(1);
  });

  it('builds on the current set when several chips are pressed in turn', () => {
    const { fixture, commits } = render([]);
    chips(fixture)[0]?.click();
    fixture.detectChanges();
    chips(fixture)[2]?.click();
    fixture.detectChanges();
    expect([...fixture.componentInstance.value()]).toStrictEqual(['common', 'rare']);
    expect(pressed(fixture)).toStrictEqual(['true', 'false', 'true']);
    expect(commits()).toBe(2);
  });

  it('removes a key on a press while selected', () => {
    const { fixture, commits } = render(['common', 'rare']);
    chips(fixture)[0]?.click();
    fixture.detectChanges();
    expect([...fixture.componentInstance.value()]).toStrictEqual(['rare']);
    expect(commits()).toBe(1);
  });

  it('offers no clear all while nothing is selected', () => {
    expect(clearButton(render([]).fixture)).toBeUndefined();
  });

  it('offers clear all while something is selected', () => {
    expect(clearButton(render(['rare']).fixture)?.textContent.trim()).toBe('Clear all');
  });

  it('names clear all after its group, so several groups on a page stay apart', () => {
    expect(clearButton(render(['rare']).fixture)?.getAttribute('aria-label')).toBe('Clear all Rarity');
  });

  it('clears every key, commits and keeps focus in the group', () => {
    const { fixture, commits } = render(['common', 'rare']);
    document.body.append(host(fixture));
    clearButton(fixture)?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value().size).toBe(0);
    expect(pressed(fixture)).toStrictEqual(['false', 'false', 'false']);
    expect(clearButton(fixture)).toBeUndefined();
    expect(commits()).toBe(1);
    expect(document.activeElement).toBe(chips(fixture)[0]);
    host(fixture).remove();
  });

  it('disables every chip and clear all', () => {
    const { fixture, commits } = render(['rare']);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect([...host(fixture).querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
    chips(fixture)[0]?.click();
    fixture.detectChanges();
    expect([...fixture.componentInstance.value()]).toStrictEqual(['rare']);
    expect(commits()).toBe(0);
  });

  it('takes the field label on the group, not on each chip', () => {
    provideField();
    const { fixture } = render(['rare']);
    const group = host(fixture).querySelector('[role="toolbar"]');
    expect(group?.id).toBe('rarity-control');
    expect(group?.getAttribute('aria-labelledby')).toBe('rarity-label');
    expect(group?.getAttribute('aria-describedby')).toBe('rarity-hint');
    expect(group?.getAttribute('aria-invalid')).toBe('true');
    expect(chips(fixture).map((chip) => chip.id)).toStrictEqual(['', '', '']);
  });

  it('describes clear all by the field label', () => {
    provideField();
    const { fixture } = render(['rare']);
    expect(clearButton(fixture)?.getAttribute('aria-describedby')).toBe('rarity-label');
  });

  it('is one Tab stop: the first selected chip, with the others skipped', () => {
    const { fixture } = render(['uncommon']);
    document.body.append(host(fixture));
    fixture.detectChanges();
    expect(chips(fixture).map((chip) => chip.getAttribute('tabindex'))).toStrictEqual(['-1', '0', '-1']);
    host(fixture).remove();
  });

  it('moves focus between chips with the arrow keys, Home and End, without pressing', () => {
    const { fixture, commits } = render([]);
    document.body.append(host(fixture));
    const [first, second, third] = chips(fixture);
    first?.focus();
    first?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(second);
    second?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(third);
    third?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    expect(pressed(fixture)).toStrictEqual(['false', 'false', 'false']);
    expect(commits()).toBe(0);
    host(fixture).remove();
  });
});
