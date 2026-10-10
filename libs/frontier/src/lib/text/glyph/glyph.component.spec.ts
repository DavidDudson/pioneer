import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Glyph } from './glyph.component';

describe(Glyph, () => {
  it('hides the glyph from screen readers and reads out its label', async () => {
    const glyph = createComponent(Glyph, {
      environmentInjector: TestBed.inject(EnvironmentInjector),
      projectableNodes: [[document.createTextNode('◆◆')]],
    });
    onTestFinished(() => {
      glyph.destroy();
    });
    glyph.setInput('label', 'Two actions');
    const appRef = TestBed.inject(ApplicationRef);
    appRef.attachView(glyph.hostView);
    await appRef.whenStable();
    const host = glyph.location.nativeElement as HTMLElement;

    expect(host.querySelector('[aria-hidden="true"]')?.textContent).toBe('◆◆');
    expect(host.querySelector('.sr-only')?.textContent).toBe('Two actions');
  });
});
