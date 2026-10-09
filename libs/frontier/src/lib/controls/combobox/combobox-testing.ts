import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import type { SelectOption } from '../select/select.component';
import { Combobox } from './combobox.component';

/* Shared by the combobox specs. */

const VIEWPORT_PX = 220;
const ROW_PX = 44;
export const LONG_LIST = 500;

export const FEATS: readonly SelectOption<string>[] = [
  { value: 'power-attack', label: 'Power Attack' },
  { value: 'sudden-charge', label: 'Sudden Charge' },
  { value: 'reactive-shield', label: 'Reactive Shield' },
];

/** Nothing is laid out in jsdom: give the listbox's scroll container a height and every option a touch-target row. */
export function stubLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT_PX);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: VIEWPORT_PX, height: ROW_PX }),
  );
}

export function longList(): readonly SelectOption<string>[] {
  return Array.from({ length: LONG_LIST }, (_entry, index) => ({
    value: `feat-${index}`,
    label: `Feat ${index + 1}`,
  }));
}

export interface Rendered {
  readonly fixture: ComponentFixture<Combobox<string>>;
  readonly host: HTMLElement;
  readonly input: HTMLInputElement;
  readonly searches: string[];
  readonly commits: () => number;
  readonly cancels: () => number;
}

interface Outputs {
  readonly searches: string[];
  readonly commits: () => number;
  readonly cancels: () => number;
}

function recordOutputs(combobox: Combobox<string>): Outputs {
  const searches: string[] = [];
  let commits = 0;
  let cancels = 0;
  combobox.searched.subscribe((query) => {
    searches.push(query);
  });
  combobox.committed.subscribe(() => {
    commits += 1;
  });
  combobox.cancelled.subscribe(() => {
    cancels += 1;
  });
  return { searches, commits: (): number => commits, cancels: (): number => cancels };
}

export function render(options: readonly SelectOption<string>[] = FEATS, value?: string): Rendered {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(Combobox<string>);
  fixture.componentRef.setInput('ariaLabel', 'Feat');
  fixture.componentRef.setInput('options', options);
  if (value !== undefined) {
    fixture.componentRef.setInput('value', value);
  }
  const outputs = recordOutputs(fixture.componentInstance);
  fixture.detectChanges();
  return { fixture, ...elementsOf(fixture), ...outputs };
}

interface Elements {
  readonly host: HTMLElement;
  readonly input: HTMLInputElement;
}

function elementsOf(fixture: ComponentFixture<Combobox<string>>): Elements {
  const host: unknown = fixture.nativeElement;
  const input = host instanceof HTMLElement ? (host.querySelector('input') ?? undefined) : undefined;
  if (!(host instanceof HTMLElement) || input === undefined) {
    throw new Error('Expected a rendered combobox');
  }
  return { host, input };
}

export async function settle(rendered: Rendered): Promise<void> {
  rendered.fixture.detectChanges();
  await rendered.fixture.whenStable();
  rendered.fixture.detectChanges();
}

export async function press(rendered: Rendered, key: string): Promise<void> {
  rendered.input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle(rendered);
}

export function type(rendered: Rendered, text: string): void {
  rendered.input.value = text;
  rendered.input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
  rendered.fixture.detectChanges();
}

export function listbox(rendered: Rendered): HTMLElement | null {
  return rendered.host.querySelector('[role="listbox"]');
}

export function optionElements(rendered: Rendered): HTMLElement[] {
  return [...rendered.host.querySelectorAll<HTMLElement>('[role="option"]')];
}

export function highlighted(rendered: Rendered): HTMLElement | undefined {
  const id = rendered.input.getAttribute('aria-activedescendant');
  return optionElements(rendered).find((option) => option.id === id);
}
