import { describe, expect, test } from 'bun:test';

import { elevationProblem } from './elevation.ts';

describe('elevationProblem', () => {
  test.each([
    'bg-surface-base',
    'border bg-surface-raised p-md',
    'hover:bg-surface-overlay',
    'z-overlay bg-surface-overlay',
    'bg-surface-raised/50',
    '!bg-surface-base',
  ])('flags %s', (classes) => {
    expect(elevationProblem(classes)?.messageId).toBe('surface');
  });

  test.each([
    'bg-elevation-raised border-elevation-raised-line',
    'bg-surface-canvas',
    'bg-surface-sunken hover:bg-surface-sunken',
    'bg-surface-inverse',
    'bg-surface-skeleton',
    'bg-surface-raised-x',
    'backdrop:bg-surface-overlay',
    'md:backdrop:bg-surface-overlay',
    'p-md text-fg-default',
  ])('allows %s', (classes) => {
    expect(elevationProblem(classes)).toBeUndefined();
  });

  test('names the offending class', () => {
    expect(elevationProblem('p-md bg-surface-raised')?.variant).toBe('bg-surface-raised');
  });
});
