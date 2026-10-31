import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Clamp, ClampLines } from './clamp.component';

/** Renders a clamp around a line of text and returns the element that cuts it off. */
async function render(lines: ClampLines): Promise<HTMLElement> {
  const clamp = createComponent(Clamp, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('A long summary.')]],
  });
  onTestFinished(() => {
    clamp.destroy();
  });
  clamp.setInput('lines', lines);
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(clamp.hostView);
  await appRef.whenStable();
  const clamped = (clamp.location.nativeElement as HTMLElement).firstElementChild;
  if (!(clamped instanceof HTMLElement)) {
    throw new TypeError('fr-clamp rendered no wrapper');
  }
  return clamped;
}

describe(Clamp, () => {
  it.each([ClampLines.One, ClampLines.Two, ClampLines.Three, ClampLines.Four])('clamps to %s lines', async (lines) => {
    const clamped = await render(lines);
    expect(clamped.classList.contains(`line-clamp-${String(lines)}`)).toBe(true);
  });

  it('keeps the whole content in the page', async () => {
    const clamped = await render(ClampLines.One);
    expect(clamped.textContent).toBe('A long summary.');
  });
});
