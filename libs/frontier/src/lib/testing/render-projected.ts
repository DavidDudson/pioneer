import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { onTestFinished } from 'vitest';

import { projectBySelector } from './project-by-selector';

/** A projectable element: `tag` with `text`, and `attribute` (empty) when a slot selects on it. */
export function element(tag: string, text: string, attribute = 'data-part'): HTMLElement {
  const created = document.createElement(tag);
  created.textContent = text;
  created.setAttribute(attribute, '');
  return created;
}

/** Renders `type` with inputs set and `projected` sorted into its slots, and returns its host. */
export async function renderProjected<Part>(
  type: Type<Part>,
  inputs: Readonly<Record<string, unknown>>,
  projected: readonly Element[],
): Promise<HTMLElement> {
  const component: ComponentRef<Part> = createComponent(type, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: projectBySelector(type, projected),
  });
  onTestFinished(() => {
    component.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    component.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(component.hostView);
  await appRef.whenStable();
  const host: unknown = component.location.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new Error('component host is not an element');
  }
  return host;
}

/** The first `selector` match under `root`; fails the test when there is none. */
export function part(root: HTMLElement, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) {
    throw new Error(`no ${selector} rendered`);
  }
  return found;
}
