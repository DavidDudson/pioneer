import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { projectBySelector } from '../../testing/project-by-selector';
import { Form } from './form.component';

interface Rendered {
  readonly form: HTMLFormElement;
  readonly submitButton: HTMLButtonElement;
  readonly submits: () => number;
}

/** Renders `fr-form` around a name input and a submit button, in the document so the form can submit. */
async function render(): Promise<Rendered> {
  const input = document.createElement('input');
  input.name = 'name';
  input.required = true;
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Create';
  const ref: ComponentRef<Form> = createComponent(Form, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: projectBySelector(Form, [input, button]),
  });
  const host = ref.location.nativeElement as HTMLElement;
  document.body.append(host);
  onTestFinished(() => {
    ref.destroy();
    host.remove();
  });
  let submits = 0;
  ref.instance.submitted.subscribe(() => {
    submits += 1;
  });
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(ref.hostView);
  await appRef.whenStable();
  const form = host.querySelector('form');
  if (form === null) {
    throw new Error('Expected a form');
  }
  return { form, submitButton: button, submits: (): number => submits };
}

describe(Form, () => {
  it('wraps its content in a form that leaves validation to the fields', async () => {
    const { form } = await render();
    expect(form.noValidate).toBe(true);
    expect(form.querySelector('input[name="name"]')).not.toBeNull();
    expect(form.querySelector('button')?.textContent).toBe('Create');
  });

  it('fires submitted on submit without a page load', async () => {
    const rendered = await render();
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: rendered.submitButton });
    rendered.form.dispatchEvent(event);
    expect(rendered.submits()).toBe(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('submits from its submit button even with an empty required field', async () => {
    const rendered = await render();
    rendered.submitButton.click();
    expect(rendered.submits()).toBe(1);
  });
});
