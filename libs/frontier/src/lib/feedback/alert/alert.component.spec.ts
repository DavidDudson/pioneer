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
  /** The element that carries the live-region role. */
  readonly region: HTMLElement;
  /** The element that lays out the icon, text and dismiss button, and sets the tone. */
  readonly wrapper: HTMLElement;
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
  const wrapper = (component.location.nativeElement as HTMLElement).firstElementChild;
  const region = wrapper?.querySelector<HTMLElement>('[role]');

  if (!(wrapper instanceof HTMLElement) || !region) {
    throw new TypeError('fr-alert rendered no live region');
  }

  return { component, region, wrapper };
}

describe(Alert, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  });

  it('is a danger alert by default', async () => {
    const { region, wrapper } = await render({});
    expect(region.getAttribute('role')).toBe('alert');
    expect([...wrapper.classList]).toStrictEqual(expect.arrayContaining(['text-caption', 'text-danger-fg']));
    expect(region.textContent.trim()).toBe('Name is required');
  });

  it.each([
    [AlertTone.Danger, 'alert', 'text-danger-fg'],
    [AlertTone.Warning, 'alert', 'text-warning-fg'],
    [AlertTone.Success, 'status', 'text-success-fg'],
    [AlertTone.Info, 'status', 'text-info-fg'],
  ])('announces %s as role="%s" in its tone', async (tone, role, colour) => {
    const { region, wrapper } = await render({ tone });
    expect(region.getAttribute('role')).toBe(role);
    expect([...wrapper.classList]).toContain(colour);
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

  it('adds no box of its own for plain text, and a flex row with an icon or a dismiss button', async () => {
    const plain = await render({});
    expect([...plain.wrapper.classList]).toContain('contents');
    const withIcon = await render({ icon: Info });
    expect([...withIcon.wrapper.classList]).toStrictEqual(expect.arrayContaining(['flex', 'gap-xs']));
    const dismissible = await render({ dismissible: true });
    expect([...dismissible.wrapper.classList]).toContain('flex');
  });

  it('shows no icon and no dismiss button by default', async () => {
    const { wrapper } = await render({});
    expect(wrapper.querySelector('svg')).toBeNull();
    expect(wrapper.querySelector('button')).toBeNull();
  });

  it('shows its icon as decoration, outside the live region', async () => {
    const { region, wrapper } = await render({ icon: Info });
    expect(wrapper.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(region.querySelector('svg')).toBeNull();
  });

  it('adds a labelled dismiss button when dismissible, and emits dismissed when pressed', async () => {
    const { component, region, wrapper } = await render({ dismissible: true });
    let dismissals = 0;
    component.instance.dismissed.subscribe(() => {
      dismissals += 1;
    });
    const button = wrapper.querySelector('button');
    expect(region.querySelector('button')).toBeNull();
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
