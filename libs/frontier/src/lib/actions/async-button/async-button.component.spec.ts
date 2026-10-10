import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SUCCESS_FLASH } from '../../async/async-action';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { AsyncButton } from './async-button.component';

const RESET_NOTIFY_MS = 10;

/** An action the test settles by hand. */
interface Deferred {
  readonly promise: Promise<undefined>;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
}

function deferred(): Deferred {
  const { promise, resolve, reject } = Promise.withResolvers<undefined>();
  return {
    promise,
    resolve: () => {
      resolve(undefined);
    },
    reject,
  };
}

async function render(action: () => Promise<unknown>): Promise<ComponentFixture<AsyncButton>> {
  TestBed.configureTestingModule({
    providers: [provideTanStackQuery(new QueryClient()), ...provideFrontierI18nTesting()],
  });
  const fixture = TestBed.createComponent(AsyncButton);
  fixture.componentRef.setInput('action', action);
  fixture.componentRef.setInput('describeError', (failure: unknown) =>
    failure instanceof Error ? failure.message : 'Failed',
  );
  TestBed.tick();
  return fixture;
}

function button(fixture: ComponentFixture<AsyncButton>): HTMLButtonElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector('button');
  if (element === null) {
    throw new Error('AsyncButton rendered no button');
  }
  return element;
}

/** Let the mutation and timers run, then render (TanStack updates its signals from root effects). */
async function settle(ms = 0): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  TestBed.tick();
}

describe(AsyncButton, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is busy while pending and ignores a second press', async () => {
    const pending = deferred();
    const action = vi.fn<() => Promise<undefined>>(async () => pending.promise);
    const fixture = await render(action);

    button(fixture).click();
    await settle();
    expect(button(fixture).getAttribute('aria-busy')).toBe('true');
    expect((fixture.nativeElement as HTMLElement).querySelector('fr-spinner')).not.toBeNull();

    button(fixture).click();
    await settle();
    expect(action).toHaveBeenCalledTimes(1);
    pending.resolve();
    await settle();
  });

  it('shows success for a moment, then returns to rest', async () => {
    const fixture = await render(async () => undefined);

    button(fixture).click();
    await settle();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"] fr-icon')).not.toBeNull();

    await settle(SUCCESS_FLASH);
    // The reset is published on TanStack's notify timer, queued after the flash timer.
    await settle(RESET_NOTIFY_MS);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"] fr-icon')).toBeNull();
    expect(button(fixture).getAttribute('aria-busy')).toBeNull();
  });

  it('shows a failure inline, linked to the button, until the next press', async () => {
    const attempts = [deferred(), deferred()];
    let call = 0;
    const fixture = await render(async () => {
      const attempt = attempts[call];
      call += 1;
      return attempt?.promise;
    });

    button(fixture).click();
    attempts[0]?.reject(new Error('Server said no'));
    await settle();
    const message = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(message?.textContent).toContain('Server said no');
    expect(button(fixture).getAttribute('aria-describedby')).toBe(message?.id);

    button(fixture).click();
    await settle();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
    attempts[1]?.resolve();
    await settle();
  });

  it('with a confirmLabel, runs only on the second press, in the same focused button', async () => {
    const action = vi.fn<() => Promise<undefined>>(async () => undefined);
    const fixture = await render(action);
    fixture.componentRef.setInput('confirmLabel', 'Remove Ezren? Press again');
    TestBed.tick();
    const pressed = button(fixture);
    pressed.focus();

    pressed.click();
    await settle();
    expect(action).not.toHaveBeenCalled();
    expect(button(fixture)).toBe(pressed);
    expect(pressed.textContent).toContain('Remove Ezren? Press again');

    pressed.click();
    await settle();
    expect(action).toHaveBeenCalledTimes(1);
    expect(pressed.textContent).not.toContain('Press again');
  });

  it('stands down when the user leaves the button or presses Escape', async () => {
    const action = vi.fn<() => Promise<undefined>>(async () => undefined);
    const fixture = await render(action);
    fixture.componentRef.setInput('confirmLabel', 'Remove Ezren? Press again');
    TestBed.tick();

    button(fixture).click();
    TestBed.tick();
    button(fixture).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    TestBed.tick();
    expect(button(fixture).textContent).not.toContain('Press again');

    button(fixture).click();
    TestBed.tick();
    button(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    TestBed.tick();
    button(fixture).click();
    await settle();
    expect(action).not.toHaveBeenCalled();
  });
});
