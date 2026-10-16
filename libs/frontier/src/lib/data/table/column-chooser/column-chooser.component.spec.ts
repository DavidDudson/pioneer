import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../../testing/provide-frontier-i18n-testing';
import { ColumnChooser } from './column-chooser.component';
import type { ColumnChoice, ColumnToggle } from './column-chooser.component';

const COLUMNS: readonly ColumnToggle[] = [
  { id: 'name', label: 'Name', visible: true, locked: false },
  { id: 'level', label: 'Level', visible: false, locked: false },
];

interface Rendered {
  readonly fixture: ComponentFixture<ColumnChooser>;
  readonly host: HTMLElement;
  readonly chosen: ColumnChoice[];
  readonly resets: () => number;
}

async function render(inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(ColumnChooser);
  fixture.componentRef.setInput('columns', COLUMNS);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  const chosen: ColumnChoice[] = [];
  let resets = 0;
  fixture.componentInstance.chosen.subscribe((choice) => {
    chosen.push(choice);
  });
  fixture.componentInstance.defaulted.subscribe(() => {
    resets += 1;
  });
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement, chosen, resets: (): number => resets };
}

function toggles(host: HTMLElement): HTMLButtonElement[] {
  return [...host.querySelectorAll<HTMLButtonElement>('fr-toggle-button button')];
}

function resetButton(host: HTMLElement): HTMLButtonElement {
  const found = [...host.querySelectorAll<HTMLButtonElement>('fr-button button')].at(-1);
  if (found === undefined) {
    throw new Error('Expected a reset button');
  }
  return found;
}

describe(ColumnChooser, () => {
  it('is a disclosure named Columns', async () => {
    const { host } = await render();
    expect(host.querySelector('summary')?.textContent.trim()).toBe('Columns');
  });

  it('lists a toggle per column, pressed when the column is shown', async () => {
    const { host } = await render();
    expect(
      toggles(host).map((button) => [button.textContent.trim(), button.getAttribute('aria-pressed')]),
    ).toStrictEqual([
      ['Name', 'true'],
      ['Level', 'false'],
    ]);
  });

  it('announces which column was pressed and whether it is now shown', async () => {
    const { fixture, host, chosen } = await render();
    toggles(host)[1]?.click();
    await fixture.whenStable();
    expect(chosen).toStrictEqual([{ id: 'level', visible: true }]);
  });

  it('disables the toggle of a locked column', async () => {
    const { host } = await render({
      columns: [
        { id: 'name', label: 'Name', visible: true, locked: true },
        { id: 'level', label: 'Level', visible: false, locked: false },
      ],
    });
    expect(toggles(host).map((button) => button.disabled)).toStrictEqual([true, false]);
  });

  it('resets on a press, unless the columns are already as they started', async () => {
    const { fixture, host, resets } = await render();
    resetButton(host).click();
    expect(resets()).toBe(1);
    fixture.componentRef.setInput('atDefault', true);
    await fixture.whenStable();
    expect(resetButton(host).disabled).toBe(true);
  });
});
