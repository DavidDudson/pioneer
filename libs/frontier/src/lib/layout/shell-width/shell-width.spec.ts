import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { BoxWidth } from '../box/box.component';
import { ShellWidth } from './shell-width';

describe(ShellWidth, () => {
  it('keeps the page width until a page shows its own', () => {
    expect(TestBed.inject(ShellWidth).current()).toBe(BoxWidth.Page);
  });

  it("follows the open page's width, and goes back to the page width when it leaves", () => {
    const shell = TestBed.inject(ShellWidth);
    const width = signal<BoxWidth>(BoxWidth.Full);
    const release = shell.show(width);
    expect(shell.current()).toBe(BoxWidth.Full);

    width.set(BoxWidth.Prose);
    expect(shell.current()).toBe(BoxWidth.Prose);

    release();
    expect(shell.current()).toBe(BoxWidth.Page);
  });

  it('leaves a later page its width when an earlier one releases after it', () => {
    const shell = TestBed.inject(ShellWidth);
    const releaseFirst = shell.show(signal<BoxWidth>(BoxWidth.Prose));
    shell.show(signal<BoxWidth>(BoxWidth.Full));
    releaseFirst();
    expect(shell.current()).toBe(BoxWidth.Full);
  });
});
