import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { AsyncStatus } from '../async-action';
import { AsyncIndicator } from './async-indicator.component';

interface Rendered {
  readonly fixture: ComponentFixture<AsyncIndicator>;
  readonly host: HTMLElement;
}

async function render(status: AsyncStatus, inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  const fixture = TestBed.createComponent(AsyncIndicator);
  fixture.componentRef.setInput('status', status);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
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

  it('shows a spinner announced as working while pending', async () => {
    const { host } = await render(AsyncStatus.Pending);
    const spinner = host.querySelector('fr-spinner');
    expect(spinner?.getAttribute('role')).toBe('status');
    expect(spinner?.getAttribute('aria-label')).toBe('Working');
    expect(host.querySelector('fr-icon:not(fr-spinner fr-icon)')).toBeNull();
  });

  it('names the spinner with the pending label', async () => {
    const { host } = await render(AsyncStatus.Pending, { pendingLabel: 'Saving' });
    expect(host.querySelector('fr-spinner')?.getAttribute('aria-label')).toBe('Saving');
  });

  it('shows a tick and announces done on success, the label for screen readers only', async () => {
    const { host } = await render(AsyncStatus.Success);
    const status = announced(host);
    expect(status?.querySelector('fr-icon')).not.toBeNull();
    expect(status?.textContent.trim()).toBe('Done');
    expect(status?.querySelector('.sr-only')?.textContent).toBe('Done');
    expect(status?.classList).toContain('text-success-fg');
    expect(host.querySelector('fr-spinner')).toBeNull();
  });

  it('announces the success label, shown beside the tick with showLabel', async () => {
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
    expect(host.querySelector('fr-spinner')).not.toBeNull();
    await step(AsyncStatus.Success);
    expect(host.querySelector('fr-spinner')).toBeNull();
    expect(announced(host)).not.toBeNull();
    await step(AsyncStatus.Idle);
    expect(host.children).toHaveLength(0);
  });
});
