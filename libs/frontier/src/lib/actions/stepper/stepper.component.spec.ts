import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { StepBody } from './step-body.directive';
import { Step } from './step.component';
import { Stepper } from './stepper.component';

@Component({
  selector: 'fr-stepper-host',
  imports: [Stepper, Step, StepBody],
  templateUrl: './stepper-host.component.html',
})
class StepperHost {
  public readonly current = signal(0);
  public readonly name = signal('');
  public finishes = 0;
}

const buttons = (root: HTMLElement): HTMLButtonElement[] => [...root.querySelectorAll('button')];
const named = (root: HTMLElement, text: string): HTMLButtonElement => {
  const found = buttons(root).find((button) => button.textContent.trim() === text);
  if (found === undefined) {
    throw new Error(`no ${text} button`);
  }
  return found;
};

describe(Stepper, () => {
  let fixture: ComponentFixture<StepperHost>;
  let root: HTMLElement;
  const settle = async (): Promise<void> => {
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
    fixture = TestBed.createComponent(StepperHost);
    root = fixture.nativeElement as HTMLElement;
    await settle();
  });

  it('is a list of steps', () => {
    expect(root.querySelector('fr-stepper')?.getAttribute('role')).toBe('list');
    expect(root.querySelectorAll('fr-step[role="listitem"]')).toHaveLength(3);
  });

  it('shows only the first step in full', () => {
    expect(root.querySelector('#identity-body')).not.toBeNull();
    expect(root.querySelector('#ancestry-body')).toBeNull();
    expect(root.querySelector('#class-body')).toBeNull();
    expect(root.textContent).not.toContain('Ancestry');
  });

  it('marks the current step with aria-current="step"', () => {
    const current = [...root.querySelectorAll('[aria-current="step"]')];
    expect(current.map((step) => step.querySelector('h3')?.textContent.trim())).toStrictEqual(['Identity']);
  });

  it('keeps Next off until the step is valid', async () => {
    expect(named(root, 'Next').disabled).toBe(true);
    fixture.componentInstance.name.set('Briar');
    await settle();
    expect(named(root, 'Next').disabled).toBe(false);
  });

  it('collapses a finished step to its summary with an Edit control, and opens the next', async () => {
    fixture.componentInstance.name.set('Briar');
    await settle();
    named(root, 'Next').click();
    await settle();
    expect(root.querySelector('#identity-body')).toBeNull();
    expect(root.textContent).toContain('Briar');
    expect(root.querySelector('#ancestry-body')).not.toBeNull();
    expect(root.querySelector('[aria-label="Edit Identity"]')).not.toBeNull();
  });

  it('closes the later steps when an earlier one is edited', async () => {
    fixture.componentInstance.name.set('Briar');
    await settle();
    named(root, 'Next').click();
    await settle();
    named(root, 'Next').click();
    await settle();
    expect(root.querySelector('#class-body')).not.toBeNull();
    root.querySelector<HTMLElement>('[aria-label="Edit Identity"]')?.click();
    await settle();
    expect(root.querySelector('#identity-body')).not.toBeNull();
    expect(root.querySelector('#class-body')).toBeNull();
    expect(root.textContent).not.toContain('Fighter');
    expect(fixture.componentInstance.current()).toBe(0);
  });

  it('goes back one step', async () => {
    fixture.componentInstance.name.set('Briar');
    await settle();
    named(root, 'Next').click();
    await settle();
    named(root, 'Back').click();
    await settle();
    expect(root.querySelector('#identity-body')).not.toBeNull();
  });

  it('moves focus to the heading of the step it arrives at', async () => {
    fixture.componentInstance.name.set('Briar');
    await settle();
    named(root, 'Next').click();
    await settle();
    expect(document.activeElement?.textContent.trim()).toBe('Ancestry');
  });

  it('reads Finish on the last step and emits finished', async () => {
    fixture.componentInstance.name.set('Briar');
    fixture.componentInstance.current.set(2);
    await settle();
    expect(buttons(root).some((button) => button.textContent.trim() === 'Next')).toBe(false);
    named(root, 'Finish').click();
    await settle();
    expect(fixture.componentInstance.finishes).toBe(1);
  });
});
