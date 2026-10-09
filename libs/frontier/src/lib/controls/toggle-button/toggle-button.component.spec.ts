import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Field } from '../../forms/field/field.component';
import { ToggleButton } from './toggle-button.component';

function render(value: boolean): ComponentFixture<ToggleButton> {
  const fixture = TestBed.createComponent(ToggleButton);
  fixture.componentRef.setInput('value', value);
  fixture.detectChanges();
  return fixture;
}

function button(fixture: ComponentFixture<ToggleButton>): HTMLButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('button');
}

describe(ToggleButton, () => {
  it('announces its state with aria-pressed', () => {
    expect(button(render(true))?.getAttribute('aria-pressed')).toBe('true');
    expect(button(render(false))?.getAttribute('aria-pressed')).toBe('false');
  });

  it('flips its value and commits on press', () => {
    const fixture = render(false);
    let commits = 0;
    fixture.componentInstance.committed.subscribe(() => {
      commits += 1;
    });
    button(fixture)?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(true);
    expect(button(fixture)?.getAttribute('aria-pressed')).toBe('true');
    expect(commits).toBe(1);
  });

  it('shows no icon: the fill is the state', () => {
    const fixture = render(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('svg')).toBeNull();
  });

  it('takes the field id and invalid state on its native button', () => {
    // Only the members a control reads from its field.
    const field = {
      controlId: 'grip-control',
      labelId: 'grip-label',
      describedBy: signal('grip-error'),
      invalid: signal(true),
    };
    TestBed.configureTestingModule({ providers: [{ provide: Field, useValue: field }] });
    const native = button(render(false));
    expect(native?.id).toBe('grip-control');
    expect(native?.getAttribute('aria-invalid')).toBe('true');
    expect(native?.getAttribute('aria-describedby')).toBe('grip-error');
  });
});
