import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BodyFont, MonoFont } from '@pioneer/shared/kernel';
import { afterEach, describe, expect, it } from 'vitest';

import { FontStylesheets } from './font-stylesheets';

function stylesheets(): string[] {
  return [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => link.href);
}

describe(FontStylesheets, () => {
  afterEach(() => {
    for (const link of TestBed.inject(DOCUMENT).head.querySelectorAll('link')) {
      link.remove();
    }
  });

  it('loads the wordmark, body and mono faces from Google Fonts', () => {
    TestBed.inject(FontStylesheets).load(BodyFont.Thematic, MonoFont.Standard);

    const loaded = stylesheets();
    expect(loaded).toHaveLength(3);
    expect(loaded.some((href) => href.includes('family=Pirata+One&text=Pioneer'))).toBe(true);
    expect(loaded.some((href) => href.includes('family=Crimson+Pro'))).toBe(true);
    expect(loaded.some((href) => href.includes('family=Fira+Code'))).toBe(true);
  });

  it('adds only the faces not loaded yet', () => {
    const fonts = TestBed.inject(FontStylesheets);
    fonts.load(BodyFont.Thematic, MonoFont.Standard);
    fonts.load(BodyFont.Thematic, MonoFont.Standard);
    expect(stylesheets()).toHaveLength(3);

    fonts.load(BodyFont.Lexend, MonoFont.Standard);
    expect(stylesheets()).toHaveLength(4);
  });

  it('loads OpenDyslexic from Fontsource, since Google Fonts does not have it', () => {
    TestBed.inject(FontStylesheets).load(BodyFont.OpenDyslexic, MonoFont.System);

    expect(stylesheets().filter((href) => href.includes('fontsource/opendyslexic'))).toHaveLength(2);
  });

  it('loads nothing for the device fonts beyond the wordmark', () => {
    TestBed.inject(FontStylesheets).load(BodyFont.System, MonoFont.System);

    expect(stylesheets()).toHaveLength(1);
  });

  it('connects to the font hosts once', () => {
    const fonts = TestBed.inject(FontStylesheets);
    fonts.load(BodyFont.Thematic, MonoFont.Standard);
    fonts.load(BodyFont.Readable, MonoFont.Typewriter);

    expect(document.head.querySelectorAll('link[rel="preconnect"]')).toHaveLength(2);
  });
});
