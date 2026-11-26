import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VirtualRow } from './virtual-row.directive';
import { VirtualRows } from './virtual-rows.directive';

const VIEWPORT_PX = 220;
const ROW_PX = 44;
const ROW_COUNT = 500;
const KEYS = Array.from({ length: ROW_COUNT }, (_entry, index) => `row-${index}`);

@Component({
  selector: 'fr-virtual-rows-host',
  imports: [VirtualRow, VirtualRows],
  templateUrl: './virtual-rows-host.component.html',
})
class Host {
  public readonly keys = signal(KEYS);
  public readonly activeIndex = signal<number | undefined>(undefined);
  public readonly pickedIndex = signal<number | undefined>(undefined);
  public readonly suspended = signal(false);
}

function render(): ComponentFixture<Host> {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();

  return fixture;
}

function elementOf(fixture: ComponentFixture<Host>): HTMLElement {
  const host: unknown = fixture.nativeElement;

  if (!(host instanceof HTMLElement)) {
    throw new TypeError('Expected a rendered host');
  }

  return host;
}

function rowElements(fixture: ComponentFixture<Host>): HTMLElement[] {
  return [...elementOf(fixture).querySelectorAll<HTMLElement>('[data-row]')];
}

/** The `data-index` of every row rendered. */
function indexes(fixture: ComponentFixture<Host>): number[] {
  return rowElements(fixture).map((row) => Number(row.dataset['index']));
}

async function settle(fixture: ComponentFixture<Host>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe(VirtualRows, () => {
  beforeEach(() => {
    // Nothing is laid out in jsdom: give the container a height and every row a touch-target height.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(VIEWPORT_PX);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: VIEWPORT_PX, height: ROW_PX }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a window of the rows, plus the first and last', async () => {
    const fixture = render();
    await settle(fixture);
    const rendered = indexes(fixture);

    expect(rendered.length).toBeLessThan(ROW_COUNT / 10);
    expect(rendered[0]).toBe(0);
    expect(rendered.at(-1)).toBe(ROW_COUNT - 1);
  });

  it('places each row where the virtualizer says', async () => {
    const fixture = render();
    await settle(fixture);
    const [first, second] = rowElements(fixture);

    expect(first?.style.transform).toBe('translateY(0px)');
    expect(second?.dataset['index']).toBe('1');
    expect(second?.style.transform).toMatch(/^translateY\([1-9]\d*px\)$/v);
  });

  it('keeps the highlight, its neighbours and the picked row rendered far from the window', async () => {
    const fixture = render();
    fixture.componentInstance.activeIndex.set(250);
    fixture.componentInstance.pickedIndex.set(400);
    await settle(fixture);

    await vi.waitFor(() => {
      expect(indexes(fixture)).toStrictEqual(expect.arrayContaining([249, 250, 251, 400]));
    });
  });

  it('renders no rows and no height while suspended', async () => {
    const fixture = render();
    fixture.componentInstance.suspended.set(true);
    await settle(fixture);

    expect(indexes(fixture)).toStrictEqual([]);
    expect(elementOf(fixture).querySelector<HTMLElement>('[data-total]')?.dataset['size']).toBe('0');
  });
});
