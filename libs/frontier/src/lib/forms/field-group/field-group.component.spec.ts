import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { FieldGroup } from './field-group.component';

describe(FieldGroup, () => {
  it('stacks its fields with the md gap between them', async () => {
    const fields = [document.createElement('span'), document.createElement('span')];

    const component = createComponent(FieldGroup, {
      environmentInjector: TestBed.inject(EnvironmentInjector),
      projectableNodes: [fields],
    });

    onTestFinished(() => {
      component.destroy();
    });

    const appRef = TestBed.inject(ApplicationRef);
    appRef.attachView(component.hostView);
    await appRef.whenStable();

    // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
    const host = component.location.nativeElement as HTMLElement;
    const flex = host.querySelector('fr-stack > div');
    expect(flex?.className).toContain('flex-col');
    expect(flex?.className).toContain('gap-md');
    expect(fields.map((field) => field.parentElement)).toStrictEqual([flex, flex]);
  });
});
