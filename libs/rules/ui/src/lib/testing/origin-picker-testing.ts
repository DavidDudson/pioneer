import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';

import { provideRulesUiI18nTesting } from './provide-rich-text-testing';

const VIEWPORT_PX = 400;
const ROW_PX = 44;

/** What each origin picker has in common to drive. */
export interface PickerUnderTest {
  readonly value: () => string | undefined;
  readonly committed: { subscribe: (next: () => void) => unknown };
  readonly cancelled: { subscribe: (next: () => void) => unknown };
}

export interface Rendered<TPicker> {
  readonly fixture: ComponentFixture<TPicker>;
  readonly host: HTMLElement;
  readonly commits: () => number;
  readonly cancels: () => number;
}

/** Nothing is laid out in jsdom: give the table's scroller a height and every row a touch-target height. */
export function stubLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT_PX);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: VIEWPORT_PX, height: ROW_PX }),
  );
}

export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Counters for what `picker` commits and cancels. */
function counting(picker: PickerUnderTest): Pick<Rendered<unknown>, 'commits' | 'cancels'> {
  let commits = 0;
  let cancels = 0;
  picker.committed.subscribe(() => {
    commits += 1;
  });
  picker.cancelled.subscribe(() => {
    cancels += 1;
  });
  return { commits: (): number => commits, cancels: (): number => cancels };
}

/** Renders `picker` with `inputs` and counts what it commits and cancels. */
export async function render<TPicker extends PickerUnderTest>(
  picker: Type<TPicker>,
  inputs: Readonly<Record<string, unknown>>,
): Promise<Rendered<TPicker>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(picker);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.componentRef.setInput('ariaLabel', 'Origin');
  const { commits, cancels } = counting(fixture.componentInstance);
  await settle(fixture);
  const host: unknown = fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new Error('Expected a rendered picker');
  }
  return { fixture, host, commits, cancels };
}

export function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

export function headers(host: HTMLElement): string[] {
  return [...host.querySelectorAll('[role="columnheader"]')].map((cell) => textOf(cell));
}

/** The first cell of each rendered row: a name, and why it can't be picked when it can't. */
export function nameCells(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('fr-picker-row')].flatMap((row) => {
    const cell = row.querySelector<HTMLElement>('[role="gridcell"]');
    return cell === null ? [] : [cell];
  });
}

export function nameCellAt(host: HTMLElement, index: number): HTMLElement {
  const cell = nameCells(host).at(index);
  if (cell === undefined) {
    throw new Error(`Expected cell ${index}`);
  }
  return cell;
}

export function rowText(host: HTMLElement, index: number): string {
  const row = [...host.querySelectorAll('fr-picker-row')].at(index);
  if (row === undefined) {
    throw new Error(`Expected row ${index}`);
  }
  return textOf(row);
}

export function rowLabels(host: HTMLElement): string[] {
  return nameCells(host).map((cell) => cell.textContent.trim());
}

function searchBox(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector('input');
  if (input === null) {
    throw new Error('Expected the table to be open');
  }
  return input;
}

export async function press(rendered: Rendered<unknown>, key: string): Promise<void> {
  searchBox(rendered.host).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle(rendered.fixture);
}

export function search(rendered: Rendered<unknown>, text: string): void {
  const input = searchBox(rendered.host);
  input.value = text;
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
  rendered.fixture.detectChanges();
}

/** The sort button in the header at `index`. */
export function sortButton(host: HTMLElement, index: number): HTMLElement {
  const button = [...host.querySelectorAll<HTMLElement>('[role="columnheader"]')].at(index)?.querySelector('button');
  if (button === null || button === undefined) {
    throw new Error(`Expected a sort button in header ${index}`);
  }
  return button;
}
