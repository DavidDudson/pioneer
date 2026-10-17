import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Pips } from './pips.component';

function render(value: number, max = 3): ComponentFixture<Pips> {
  const fixture = TestBed.createComponent(Pips);
  fixture.componentRef.setInput('max', max);
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('ariaLabel', 'Hero Points');
  fixture.detectChanges();
  return fixture;
}

function buttons(fixture: ComponentFixture<Pips>): HTMLButtonElement[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
}

function commits(fixture: ComponentFixture<Pips>): () => number {
  let count = 0;
  fixture.componentInstance.committed.subscribe(() => {
    count += 1;
  });
  return () => count;
}

describe(Pips, () => {
  it('shows a pip per point, the first `value` pressed', () => {
    const fixture = render(2);
    expect(buttons(fixture).map((button) => button.getAttribute('aria-pressed'))).toStrictEqual([
      'true',
      'true',
      'false',
    ]);
  });

  it('names the group and each pip by its place', () => {
    const fixture = render(1);
    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="toolbar"]');
    expect(group?.getAttribute('aria-label')).toBe('Hero Points');
    expect(buttons(fixture).map((button) => button.getAttribute('aria-label'))).toStrictEqual([
      'Hero Points 1',
      'Hero Points 2',
      'Hero Points 3',
    ]);
  });

  it('fills up to an empty pip pressed and commits', () => {
    const fixture = render(1);
    const count = commits(fixture);
    buttons(fixture)[2]?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(3);
    expect(count()).toBe(1);
  });

  it('empties down to before a filled pip pressed that is not the last', () => {
    const fixture = render(3);
    buttons(fixture)[0]?.click();
    expect(fixture.componentInstance.value()).toBe(1);
  });

  it('empties the last filled pip when it is pressed', () => {
    const fixture = render(2);
    buttons(fixture)[1]?.click();
    expect(fixture.componentInstance.value()).toBe(1);
  });

  it('can be emptied by pressing the only filled pip', () => {
    const fixture = render(1);
    buttons(fixture)[0]?.click();
    expect(fixture.componentInstance.value()).toBe(0);
  });

  it('presses nothing while disabled', () => {
    const fixture = render(1);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const count = commits(fixture);
    buttons(fixture)[2]?.click();
    expect(fixture.componentInstance.value()).toBe(1);
    expect(count()).toBe(0);
  });

  it('makes the last filled pip the only tab stop, the first when none is filled', () => {
    expect(buttons(render(2)).map((button) => button.getAttribute('tabindex'))).toStrictEqual(['-1', '0', '-1']);
    expect(buttons(render(0)).map((button) => button.getAttribute('tabindex'))).toStrictEqual(['0', '-1', '-1']);
  });

  it('moves focus with the arrow keys without pressing', () => {
    const fixture = render(1);
    const [first, second] = buttons(fixture);
    first?.focus();
    first?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(second);
    expect(fixture.componentInstance.value()).toBe(1);
  });
});
