import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TextArea } from './text-area.component';

function render(): ComponentFixture<TextArea> {
  const fixture = TestBed.createComponent(TextArea);
  fixture.componentRef.setInput('ariaLabel', 'JSON');
  fixture.detectChanges();
  return fixture;
}

function textarea(fixture: ComponentFixture<TextArea>): HTMLTextAreaElement {
  const element = (fixture.nativeElement as HTMLElement).querySelector('textarea');
  if (element === null) {
    throw new Error('Expected a textarea');
  }
  return element;
}

describe(TextArea, () => {
  it('keeps typed text, newlines included, in its value', () => {
    const fixture = render();
    const element = textarea(fixture);
    element.value = '[\n  "self:condition:frightened"\n]';
    element.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe('[\n  "self:condition:frightened"\n]');
  });

  it('shows rows lines and is labelled when standing alone', () => {
    const fixture = render();
    fixture.componentRef.setInput('rows', 3);
    fixture.detectChanges();
    const element = textarea(fixture);
    expect(element.rows).toBe(3);
    expect(element.getAttribute('aria-label')).toBe('JSON');
  });
});
