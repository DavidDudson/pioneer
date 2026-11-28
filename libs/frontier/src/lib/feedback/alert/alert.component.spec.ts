import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Info } from 'lucide';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { element, part, renderProjected } from '../../testing/render-projected';
import { AlertDescription } from './alert-description.component';
import { AlertTitle } from './alert-title.component';
import { Alert, AlertTone } from './alert.component';

interface Rendered {
  readonly component: ComponentRef<Alert>;
  /** The live region. */
  readonly region: HTMLElement;
}

/** Renders `fr-alert` with `text` projected and returns it and the element that carries the role. */
async function render(inputs: ComponentInputs<Alert>, text = 'Name is required'): Promise<Rendered> {
  const component = createComponent(Alert, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [text === '' ? [] : [document.createTextNode(text)]],
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
  const region = (component.location.nativeElement as HTMLElement).firstElementChild;

  if (!(region instanceof HTMLElement)) {
    throw new TypeError('fr-alert rendered no element');
  }

  return { component, region };
}

describe(Alert, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('is a danger alert by default', async () => {
    const { region } = await render({});
    expect(region.getAttribute('role')).toBe('alert');
    expect([...region.classList]).toStrictEqual(expect.arrayContaining(['text-caption', 'text-danger-fg']));
    expect(region.textContent.trim()).toBe('Name is required');
  });

  it.each([
    [AlertTone.Danger, 'alert', 'text-danger-fg'],
    [AlertTone.Warning, 'alert', 'text-warning-fg'],
    [AlertTone.Success, 'status', 'text-success-fg'],
    [AlertTone.Info, 'status', 'text-info-fg'],
  ])('announces %s as role="%s" in its tone', async (tone, role, colour) => {
    const { region } = await render({ tone });
    expect(region.getAttribute('role')).toBe(role);
    expect([...region.classList]).toContain(colour);
  });

  it('takes an id for aria-describedby, and none by default', async () => {
    const plain = await render({});
    expect(plain.region.hasAttribute('id')).toBe(false);
    const described = await render({ id: 'name-error' });
    expect(described.region.id).toBe('name-error');
  });

  it('renders the live region with nothing in it, so later content is announced', async () => {
    const { region } = await render({}, '');
    expect(region.getAttribute('role')).toBe('alert');
    expect(region.textContent.trim()).toBe('');
  });

  it('shows no icon and no dismiss button by default', async () => {
    const { region } = await render({});
    expect(region.querySelector('svg')).toBeNull();
    expect(region.querySelector('button')).toBeNull();
  });

  it('shows its icon as decoration', async () => {
    const { region } = await render({ icon: Info });
    expect(region.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds a labelled dismiss button when dismissible, and emits dismissed when pressed', async () => {
    const { component, region } = await render({ dismissible: true });
    let dismissals = 0;
    component.instance.dismissed.subscribe(() => {
      dismissals += 1;
    });
    const button = region.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Dismiss');
    button?.click();
    expect(dismissals).toBe(1);
  });
});

describe(AlertTitle, () => {
  it('shows its text as a paragraph', async () => {
    const host = await renderProjected(AlertTitle, {}, [element('span', 'Changed elsewhere')]);
    expect(part(host, 'p').textContent.trim()).toBe('Changed elsewhere');
  });
});

describe(AlertDescription, () => {
  it('shows its text as a paragraph', async () => {
    const host = await renderProjected(AlertDescription, {}, [element('span', 'Showing the latest version.')]);
    expect(part(host, 'p').textContent.trim()).toBe('Showing the latest version.');
  });
});
