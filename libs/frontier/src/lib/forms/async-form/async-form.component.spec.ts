import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { form, required } from '@angular/forms/signals';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncStatus } from '../../async/async-action';
import { AsyncForm } from './async-form.component';

interface Model {
  readonly name: string;
}

async function render(
  name: string,
  action: (value: Model) => Promise<unknown>,
): Promise<ComponentFixture<AsyncForm<Model>>> {
  TestBed.configureTestingModule({ providers: [provideTanStackQuery(new QueryClient())] });
  const tree = TestBed.runInInjectionContext(() =>
    form(signal<Model>({ name }), (path) => {
      required(path.name);
    }),
  );
  const fixture = TestBed.createComponent<AsyncForm<Model>>(AsyncForm);
  fixture.componentRef.setInput('form', tree);
  fixture.componentRef.setInput('action', action);
  fixture.componentRef.setInput('describeError', () => 'Could not create');
  TestBed.tick();
  return fixture;
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  TestBed.tick();
}

describe(AsyncForm, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not run the action for an invalid form, and shows no success', async () => {
    const action = vi.fn<(value: Model) => Promise<undefined>>(async () => undefined);
    const fixture = await render('', action);

    fixture.componentInstance.submission.run();
    await settle();

    expect(action).not.toHaveBeenCalled();
    expect(fixture.componentInstance.submission.status()).toBe(AsyncStatus.Idle);
  });

  it('runs the action with the model value when valid, then succeeds', async () => {
    const action = vi.fn<(value: Model) => Promise<undefined>>(async () => undefined);
    const fixture = await render('Valeros', action);

    fixture.componentInstance.submission.run();
    await settle();

    expect(action).toHaveBeenCalledWith({ name: 'Valeros' });
    expect(fixture.componentInstance.submission.status()).toBe(AsyncStatus.Success);
  });

  it('reports the action failure through describeError', async () => {
    const fixture = await render('Valeros', async () => {
      throw new Error('500');
    });

    fixture.componentInstance.submission.run();
    await settle();

    expect(fixture.componentInstance.submission.status()).toBe(AsyncStatus.Error);
    expect(fixture.componentInstance.submission.errorMessage()).toBe('Could not create');
  });
});
