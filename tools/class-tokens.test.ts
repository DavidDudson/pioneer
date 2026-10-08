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
