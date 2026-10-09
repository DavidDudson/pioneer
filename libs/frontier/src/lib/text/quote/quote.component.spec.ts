import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Quote } from './quote.component';

/** Renders a quote with `passage` projected and returns its host element. */
async function render(
  inputs: Readonly<Record<string, unknown>>,
  passage = 'You are gripped by fear.',
): Promise<HTMLElement> {
  const text = document.createTextNode(passage);
  const quote = createComponent(Quote, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[text]],
  });
  onTestFinished(() => {
    quote.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    quote.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(quote.hostView);
  await appRef.whenStable();
  return quote.location.nativeElement as HTMLElement;
}

describe(Quote, () => {
  it('projects the passage into a <blockquote> with no attribution by default', async () => {
    const host = await render({});
    const blockquote = host.querySelector('blockquote');
    expect(blockquote?.textContent.trim()).toBe('You are gripped by fear.');
    expect(host.querySelector('p')).toBeNull();
  });

  it('names the source below the quote, outside the <blockquote>', async () => {
    const host = await render({ attribution: 'Player Core' });
    const attribution = host.querySelector('p');
    expect(attribution?.textContent.trim()).toBe('Player Core');
    expect(attribution?.closest('blockquote')).toBeNull();
    expect(attribution?.classList.contains('text-caption')).toBe(true);
  });
});
