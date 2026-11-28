import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { AsyncStatus } from '../async-action';
import { AsyncIndicator } from './async-indicator.component';

interface Rendered {
  readonly fixture: ComponentFixture<AsyncIndicator>;
  readonly host: HTMLElement;
}

async function render(status: AsyncStatus, inputs: ComponentInputs<AsyncIndicator> = {}): Promise<Rendered> {
  const fixture = TestBed.createComponent(AsyncIndicator);
  fixture.componentRef.setInput('status', status);

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  await fixture.whenStable();

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

function announced(host: HTMLElement): HTMLElement | null {
  return host.querySelector('[role="status"]');
}

describe(AsyncIndicator, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it.each([AsyncStatus.Idle, AsyncStatus.Error])('shows nothing while %s', async (status) => {
    const { host } = await render(status);
    expect(host.children).toHaveLength(0);
  });

  it('announces "Working" for screen readers only while pending', async () => {
    const { host } = await render(AsyncStatus.Pending);
    const status = announced(host);
    expect(status?.textContent.trim()).toBe('Working');
    expect(status?.classList).toContain('sr-only');
    expect(host.querySelector('fr-icon')).toBeNull();
  });

  it('shows the pending label with showLabel', async () => {
    const { host } = await render(AsyncStatus.Pending, { pendingLabel: 'Saving', showLabel: true });
    const status = announced(host);
    expect(status?.textContent.trim()).toBe('Saving');
    expect(status?.classList).not.toContain('sr-only');
  });

  it('shows no tick and no visible label with announceOnly', async () => {
    const { host } = await render(AsyncStatus.Success, { announceOnly: true, showLabel: true });
    const status = announced(host);
    expect(status?.querySelector('fr-icon')).toBeNull();
    expect(status?.querySelector('.sr-only')?.textContent).toBe('Done');
  });

  it('shows a tick in a status element on success, the label for screen readers only', async () => {
    const { host } = await render(AsyncStatus.Success);
    const status = announced(host);
    expect(status?.querySelector('fr-icon')).not.toBeNull();
    expect(status?.textContent.trim()).toBe('Done');
    expect(status?.querySelector('.sr-only')?.textContent).toBe('Done');
    expect(status?.classList).toContain('text-success-fg');
  });

  it('puts the success label in the status element, shown beside the tick with showLabel', async () => {
    const { host } = await render(AsyncStatus.Success, { successLabel: 'Saved', showLabel: true });
    const status = announced(host);
    expect(status?.textContent.trim()).toBe('Saved');
    expect(status?.querySelector('.sr-only')).toBeNull();
    expect(status?.querySelector('.text-caption')?.textContent).toBe('Saved');
  });

  it('follows the status through a run', async () => {
    const { fixture, host } = await render(AsyncStatus.Idle);

    const step = async (status: AsyncStatus): Promise<void> => {
      fixture.componentRef.setInput('status', status);
      await fixture.whenStable();
    };

    await step(AsyncStatus.Pending);
    expect(announced(host)?.textContent.trim()).toBe('Working');
    await step(AsyncStatus.Success);
    expect(host.querySelector('fr-icon')).not.toBeNull();
    expect(announced(host)).not.toBeNull();
    await step(AsyncStatus.Idle);
    expect(host.children).toHaveLength(0);
  });
});
