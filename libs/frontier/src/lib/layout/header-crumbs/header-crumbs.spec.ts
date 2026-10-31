import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { BreadcrumbItem } from '../../actions/breadcrumbs/breadcrumbs.component';
import { HeaderCrumbs } from './header-crumbs';

const trail = (label: string): BreadcrumbItem[] => [{ label: 'Characters', to: '/characters' }, { label }];

describe(HeaderCrumbs, () => {
  it('is empty until a page shows a trail', () => {
    expect(TestBed.inject(HeaderCrumbs).trail()).toStrictEqual([]);
  });

  it('shows the trail of a page, following it as it changes, until the page leaves', () => {
    const crumbs = TestBed.inject(HeaderCrumbs);
    const page = signal(trail('Valeros'));
    const release = crumbs.show(page);
    expect(crumbs.trail()).toStrictEqual(trail('Valeros'));
    page.set(trail('Seelah'));
    expect(crumbs.trail()).toStrictEqual(trail('Seelah'));
    release();
    expect(crumbs.trail()).toStrictEqual([]);
  });

  it('keeps the next page trail when the previous page leaves after it arrives', () => {
    const crumbs = TestBed.inject(HeaderCrumbs);
    const releaseFirst = crumbs.show(signal(trail('Valeros')));
    const releaseSecond = crumbs.show(signal(trail('Seelah')));
    releaseFirst();
    expect(crumbs.trail()).toStrictEqual(trail('Seelah'));
    releaseSecond();
    expect(crumbs.trail()).toStrictEqual([]);
  });
});
