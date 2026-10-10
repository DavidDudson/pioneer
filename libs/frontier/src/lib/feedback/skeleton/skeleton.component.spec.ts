import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Skeleton, SkeletonShape, SkeletonWidth } from './skeleton.component';

async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(Skeleton);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(Skeleton, () => {
  it('is hidden from assistive tech', async () => {
    const host = await render({});
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('shimmers as a medium line of text by default', async () => {
    const host = await render({});
    expect([...host.classList]).toStrictEqual(
      expect.arrayContaining(['animate-shimmer', 'bg-surface-skeleton', 'h-lh', 'w-placeholder-md']),
    );
  });

  it.each([
    [SkeletonWidth.Xs, 'w-xl'],
    [SkeletonWidth.Sm, 'w-3xl'],
    [SkeletonWidth.Md, 'w-placeholder-md'],
    [SkeletonWidth.Lg, 'w-placeholder-lg'],
    [SkeletonWidth.Full, 'w-full'],
  ])('is %s wide as %s', async (width, expected) => {
    const host = await render({ width });
    expect([...host.classList]).toContain(expected);
  });

  it('shapes a block', async () => {
    const host = await render({ shape: SkeletonShape.Block, width: SkeletonWidth.Full });
    expect([...host.classList]).toStrictEqual(expect.arrayContaining(['h-2xl', 'w-full']));
  });

  it('keeps a square square, ignoring the width', async () => {
    const host = await render({ shape: SkeletonShape.Square, width: SkeletonWidth.Full });
    expect([...host.classList]).toContain('size-xl');
    expect([...host.classList].filter((name) => name.startsWith('w-'))).toStrictEqual([]);
  });
});
