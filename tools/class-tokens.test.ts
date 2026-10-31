import { describe, expect, test } from 'bun:test';

import { classTokenProblem } from './class-tokens.ts';

describe('classTokenProblem: physical directions', () => {
  test.each([
    'ml-auto',
    'pr-sm',
    '-mr-2xs',
    'left-none',
    'right-md',
    'border-l',
    'border-r-line',
    'text-left',
    'hover:text-right',
  ])('flags %s', (classes) => {
    expect(classTokenProblem(classes, false)?.messageId).toBe('physical');
  });

  test.each([
    'ms-auto',
    'pe-sm',
    'start-none',
    'end-md',
    'border-s',
    'text-start',
    'pl-safe-left pr-safe-right',
    'px-sm',
  ])('allows %s', (classes) => {
    expect(classTokenProblem(classes, false)).toBeUndefined();
  });
});

describe('classTokenProblem: forced colours', () => {
  test.each([
    'bg-system-highlight',
    'hover:text-system-highlight-text',
    'aria-pressed:border-system-canvas-text',
    'border-t-system-highlight',
    'divide-system-canvas-text',
    'caret-system-highlight',
  ])('flags system colour %s outside forced-colors:', (classes) => {
    expect(classTokenProblem(classes, false)?.messageId).toBe('systemColour');
  });

  test.each([
    'forced-colors:bg-accent-solid',
    'forced-colors:aria-pressed:text-accent-on-solid',
    'forced-colors:border-line-default',
    'forced-colors:border-b-accent-solid',
    'forced-colors:divide-line-default',
    'forced-colors:placeholder-fg-subtle',
  ])('flags theme colour %s under forced-colors:', (classes) => {
    expect(classTokenProblem(classes, false)?.messageId).toBe('forcedColour');
  });

  test.each([
    'forced-colors:bg-system-highlight',
    'forced-colors:aria-pressed:hover:text-system-highlight-text',
    'forced-colors:border',
    'forced-colors:underline',
    'bg-accent-solid text-caption',
  ])('allows %s', (classes) => {
    expect(classTokenProblem(classes, false)).toBeUndefined();
  });
});

describe('classTokenProblem: sharp and flat', () => {
  test.each(['rounded-md', 'rounded-full', 'rounded', 'shadow-sm', 'ring-2'])('flags %s', (classes) => {
    expect(classTokenProblem(classes, false)?.messageId).toBe('sharp');
  });

  test('allows the one toast radius (ADR-0074)', () => {
    expect(classTokenProblem('rounded-toast', false)).toBeUndefined();
  });
});
