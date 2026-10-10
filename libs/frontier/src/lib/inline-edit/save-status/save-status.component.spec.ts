import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as z from 'zod';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { InlineEdit, REVERT_WINDOW } from '../inline-edit';
import { SaveStatus } from './save-status.component';

interface Rendered {
  readonly fixture: ComponentFixture<SaveStatus<string>>;
  readonly host: HTMLElement;
  readonly edit: InlineEdit<string>;
  readonly save: Mock<(value: string) => Promise<void>>;
}

/** A name edit whose save waits on `gate` (if given), then stores the value like the server would. */
async function render(gate?: Promise<unknown>, fail = false): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const source: WritableSignal<string | undefined> = signal('Valeros');
  const save = vi.fn<(value: string) => Promise<void>>(async (value) => {
    await gate;
    if (fail) {
      throw new Error('Offline');
    }
    source.set(value);
  });
  const edit = new InlineEdit<string>({ source, empty: '', schema: z.string().min(1), save });
  const fixture = TestBed.createComponent(SaveStatus<string>);
  fixture.componentRef.setInput('label', 'Name');
  fixture.componentRef.setInput('edit', edit);
  await settle(fixture);
  return { fixture, host: fixture.nativeElement as HTMLElement, edit, save };
}

async function settle(fixture: ComponentFixture<SaveStatus<string>>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

/** Opens the edit and saves `value` through it, without waiting for the save to land. */
async function change(rendered: Rendered, value: string): Promise<void> {
  rendered.edit.edit();
  rendered.edit.change(value);
  await rendered.edit.flush();
}

function revertButton(rendered: Rendered): HTMLButtonElement | undefined {
  return [...rendered.host.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Revert');
}

describe(SaveStatus, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing while nothing is saving or saved', async () => {
    const rendered = await render();
    expect(rendered.host.querySelector('[role="status"]')).toBeNull();
    expect(rendered.host.querySelector('button')).toBeNull();
  });

  it('shows a spinner labelled with the field while saving', async () => {
    const gate = Promise.withResolvers<undefined>();
    const rendered = await render(gate.promise);
    const saving = change(rendered, 'Seelah');
    await settle(rendered.fixture);
    const spinner = rendered.host.querySelector('fr-spinner');
    expect(spinner?.getAttribute('role')).toBe('status');
    expect(spinner?.getAttribute('aria-label')).toBe('Saving Name');
    expect(revertButton(rendered)).toBeUndefined();
    gate.resolve(undefined);
    await saving;
  });

  it('announces "Saved" with a tick and offers Revert once saved', async () => {
    const rendered = await render();
    await change(rendered, 'Seelah');
    await settle(rendered.fixture);
    expect(rendered.host.querySelector('fr-spinner')).toBeNull();
    const status = rendered.host.querySelector('[role="status"]');
    expect(status?.textContent.trim()).toBe('Saved');
    expect(status?.querySelector('svg')).not.toBeNull();
    expect(revertButton(rendered)).toBeDefined();
  });

  it('puts the value from before the edit back from Revert', async () => {
    const rendered = await render();
    await change(rendered, 'Seelah');
    await settle(rendered.fixture);
    revertButton(rendered)?.click();
    await vi.waitFor(() => {
      expect(rendered.save).toHaveBeenLastCalledWith('Valeros');
    });
    await settle(rendered.fixture);
    expect(rendered.edit.draft()).toBe('Valeros');
    expect(revertButton(rendered)).toBeUndefined();
  });

  it('stops offering Revert and clears "Saved" when the revert window ends', async () => {
    vi.useFakeTimers();
    const rendered = await render();
    await change(rendered, 'Seelah');
    await settle(rendered.fixture);
    await vi.advanceTimersByTimeAsync(REVERT_WINDOW);
    await settle(rendered.fixture);
    expect(rendered.host.querySelector('[role="status"]')).toBeNull();
    expect(revertButton(rendered)).toBeUndefined();
  });

  it('shows neither "Saved" nor Revert after a failed save, which the field reports instead', async () => {
    const rendered = await render(undefined, true);
    await change(rendered, 'Seelah');
    await settle(rendered.fixture);
    expect(rendered.host.querySelector('[role="status"]')).toBeNull();
    expect(rendered.host.querySelector('fr-spinner')).toBeNull();
    expect(revertButton(rendered)).toBeUndefined();
  });
});
