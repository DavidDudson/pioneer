import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ShellSearch } from './shell-search';

describe(ShellSearch, () => {
  it('shows the shell search until a page hides it', () => {
    const search = TestBed.inject(ShellSearch);
    expect(search.hidden()).toBe(false);
    const release = search.hide();
    expect(search.hidden()).toBe(true);
    release();
    expect(search.hidden()).toBe(false);
  });

  it('stays hidden until every page that hid it has let go', () => {
    const search = TestBed.inject(ShellSearch);
    const first = search.hide();
    const second = search.hide();
    first();
    expect(search.hidden()).toBe(true);
    second();
    expect(search.hidden()).toBe(false);
  });

  it('counts each request for the cursor, so asking again is a change', () => {
    const search = TestBed.inject(ShellSearch);
    expect(search.focusRequests()).toBe(0);
    search.requestFocus();
    search.requestFocus();
    expect(search.focusRequests()).toBe(2);
  });

  it('counts a release only once', () => {
    const search = TestBed.inject(ShellSearch);
    const first = search.hide();
    search.hide();
    first();
    first();
    expect(search.hidden()).toBe(true);
  });
});
