import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Stat } from './stat.component';

/** Renders `fr-stat` with `label` and a projected value, and returns its host. */
async function render(label: string, value: string): Promise<HTMLElement> {
  const component = createComponent(Stat, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode(value)]],
  });

  onTestFinished(() => {
    component.destroy();
  });

  component.setInput('label', label);
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(component.hostView);
  await appRef.whenStable();

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return component.location.nativeElement as HTMLElement;
}

describe(Stat, () => {
  it('shows the caption above the value', async () => {
    const host = await render('Armor Class', '18');
    const texts = [...host.querySelectorAll('fr-text')];
    expect(texts.map((text) => text.textContent.trim())).toStrictEqual(['Armor Class', '18']);
  });

  it('sets the caption small and the value in tabular figures', async () => {
    const host = await render('Armor Class', '18');
    const [caption, value] = [...host.querySelectorAll('fr-text')];
    expect(caption?.firstElementChild?.className).toContain('text-caption');
    expect(value?.firstElementChild?.className).toContain('tabular-nums');
  });
});
