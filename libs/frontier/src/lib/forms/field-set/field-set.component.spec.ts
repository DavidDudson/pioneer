import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { FieldSet } from './field-set.component';

/** Renders `fr-field-set` with one projected span and returns its host. */
async function render(inputs: ComponentInputs<FieldSet>): Promise<HTMLElement> {
  const component = createComponent(FieldSet, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createElement('span')]],
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

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return component.location.nativeElement as HTMLElement;
}

describe(FieldSet, () => {
  it('renders a fieldset named by its legend', async () => {
    const host = await render({ legend: 'Identity' });
    const legend = host.querySelector('fieldset > legend');
    expect(legend?.textContent).toBe('Identity');
    expect(legend?.className).not.toContain('sr-only');
  });

  it('keeps the legend for screen readers when it is hidden', async () => {
    const host = await render({ legend: 'Identity', legendHidden: '' });
    expect(host.querySelector('legend')?.className).toContain('sr-only');
  });

  it('puts its fields in a field group', async () => {
    const host = await render({ legend: 'Identity' });
    expect(host.querySelector('fieldset > fr-field-group span')).not.toBeNull();
  });
});
