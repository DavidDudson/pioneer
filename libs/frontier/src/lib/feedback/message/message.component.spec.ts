import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Message, MessageTone } from './message.component';

/** Renders `fr-message` with "Name is required" projected and returns the element it renders. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
  const message = createComponent(Message, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('Name is required')]],
  });
  onTestFinished(() => {
    message.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    message.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(message.hostView);
  await appRef.whenStable();
  const rendered = (message.location.nativeElement as HTMLElement).firstElementChild;
  if (!(rendered instanceof HTMLElement)) {
    throw new Error('fr-message rendered no element');
  }
  return rendered;
}

describe(Message, () => {
  it('is a danger alert by default', async () => {
    const rendered = await render({});
    expect(rendered.getAttribute('role')).toBe('alert');
    expect([...rendered.classList]).toStrictEqual(expect.arrayContaining(['text-caption', 'text-danger-fg']));
    expect(rendered.textContent.trim()).toBe('Name is required');
  });

  it.each([
    [MessageTone.Danger, 'alert', 'text-danger-fg'],
    [MessageTone.Warning, 'alert', 'text-warning-fg'],
    [MessageTone.Success, 'status', 'text-success-fg'],
    [MessageTone.Info, 'status', 'text-info-fg'],
  ])('announces %s as role="%s" in its tone', async (tone, role, colour) => {
    const rendered = await render({ tone });
    expect(rendered.getAttribute('role')).toBe(role);
    expect([...rendered.classList]).toContain(colour);
  });

  it('takes an id for aria-describedby, and none by default', async () => {
    const plain = await render({});
    expect(plain.hasAttribute('id')).toBe(false);
    const described = await render({ id: 'name-error' });
    expect(described.id).toBe('name-error');
  });
});
