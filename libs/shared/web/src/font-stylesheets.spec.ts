import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BodyFont, MonoFont } from '@pioneer/shared/kernel';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FontStylesheets } from './font-stylesheets';

function stylesheets(): Array<string> {
  return [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => link.href);
}

/** The family names in the Google stylesheet's URL, in request order (the wordmark's own request left out). */
function googleFamilies(): Array<string> {
  return stylesheets()
    .filter((href) => href.includes('family=') && !href.includes('Pirata+One'))
    .flatMap((href) => new URL(href).searchParams.getAll('family'))
    .map((family) => family.slice(0, family.indexOf(':')));
}

function removeLinks(): void {
  for (const link of TestBed.inject(DOCUMENT).head.querySelectorAll('link')) {
    link.remove();
  }
}

const compareNames = (first: string, second: string): number => first.localeCompare(second);

/** The Google families each body font needs, sorted by name; the device font needs none. */
const BODY_FAMILIES: Readonly<Record<BodyFont, ReadonlyArray<string>>> = {
  [BodyFont.Thematic]: ['Atkinson Hyperlegible Next', 'Crimson Pro', 'Fraunces'],
  [BodyFont.Readable]: ['Atkinson Hyperlegible Next', 'Fraunces'],
  [BodyFont.Lexend]: ['Fraunces', 'Lexend'],
  [BodyFont.OpenDyslexic]: ['Fraunces'],
  [BodyFont.System]: [],
};

const MONO_FAMILIES: Readonly<Record<MonoFont, ReadonlyArray<string>>> = {
  [MonoFont.Standard]: ['Fira Code'],
  [MonoFont.Typewriter]: ['Courier Prime'],
  [MonoFont.System]: [],
};

const BODY_ROWS = Object.values(BodyFont).map((body) => ({ body, expected: BODY_FAMILIES[body] }));

const MONO_ROWS = Object.values(MonoFont).map((mono) => ({ mono, expected: MONO_FAMILIES[mono] }));

/** Stylesheets the body face needs on its own: OpenDyslexic two Fontsource files, the device's none. */
const BODY_REQUESTS: Readonly<Record<BodyFont, number>> = {
  [BodyFont.Thematic]: 1,
  [BodyFont.Readable]: 1,
  [BodyFont.Lexend]: 1,
  [BodyFont.OpenDyslexic]: 2,
  [BodyFont.System]: 0,
};

/** Stylesheets the mono face needs on its own. */
const MONO_REQUESTS: Readonly<Record<MonoFont, number>> = {
  [MonoFont.Standard]: 1,
  [MonoFont.Typewriter]: 1,
  [MonoFont.System]: 0,
};

const WORDMARK_REQUESTS = 1;

/** OpenDyslexic with a device mono face leaves Fraunces without a Google request to share. */
const extraDisplayFaceRequests = (body: BodyFont, mono: MonoFont): number =>
  body === BodyFont.OpenDyslexic && mono === MonoFont.System ? 1 : 0;

const BUDGET = Object.values(BodyFont).flatMap((body) =>
  Object.values(MonoFont).map((mono) => ({
    body,
    mono,
    limit: WORDMARK_REQUESTS + BODY_REQUESTS[body] + MONO_REQUESTS[mono] + extraDisplayFaceRequests(body, mono),
  })),
);

describe(FontStylesheets, () => {
  // Another spec in the same worker may have left its links in the shared document.
  beforeEach(removeLinks);

  afterEach(removeLinks);

  it('loads the wordmark and one stylesheet for every Google face the choices need', () => {
    TestBed.inject(FontStylesheets).load(BodyFont.Thematic, MonoFont.Standard);

    const loaded = stylesheets();
    expect(loaded).toHaveLength(2);
    expect(loaded.some((href) => href.includes('family=Pirata+One&text=Pioneer'))).toBe(true);

    const faces = loaded.find((href) => href.includes('family=Fraunces'));
    expect(faces).toContain('family=Crimson+Pro');
    expect(faces).toContain('family=Atkinson+Hyperlegible+Next');
    expect(faces).toContain('family=Fira+Code');
  });

  it('lists the families sorted by name, as the css2 API requires', () => {
    TestBed.inject(FontStylesheets).load(BodyFont.Thematic, MonoFont.Typewriter);

    expect(googleFamilies()).toStrictEqual(['Atkinson Hyperlegible Next', 'Courier Prime', 'Crimson Pro', 'Fraunces']);
  });

  it.each(BODY_ROWS)('asks for exactly the families the $body body font needs', ({ body, expected }) => {
    TestBed.inject(FontStylesheets).load(body, MonoFont.System);

    expect(googleFamilies()).toStrictEqual(expected);
  });

  it.each(MONO_ROWS)('adds the $mono mono face to the request', ({ mono, expected }) => {
    TestBed.inject(FontStylesheets).load(BodyFont.Lexend, mono);

    expect(googleFamilies()).toStrictEqual([...expected, 'Fraunces', 'Lexend'].toSorted(compareNames));
  });

  it('adds only the faces not loaded yet', () => {
    const fonts = TestBed.inject(FontStylesheets);
    fonts.load(BodyFont.Thematic, MonoFont.Standard);
    fonts.load(BodyFont.Thematic, MonoFont.Standard);
    expect(stylesheets()).toHaveLength(2);

    fonts.load(BodyFont.Lexend, MonoFont.Standard);
    expect(stylesheets()).toHaveLength(3);
  });

  it.each([BodyFont.Thematic, BodyFont.Readable, BodyFont.Lexend, BodyFont.OpenDyslexic])(
    'asks for the display face with the %s body font',
    (body) => {
      TestBed.inject(FontStylesheets).load(body, MonoFont.System);

      expect(stylesheets().some((href) => href.includes('family=Fraunces'))).toBe(true);
    },
  );

  it('asks for no display face with the device body font', () => {
    TestBed.inject(FontStylesheets).load(BodyFont.System, MonoFont.Standard);

    expect(stylesheets().some((href) => href.includes('family=Fraunces'))).toBe(false);
  });

  it('loads OpenDyslexic from Fontsource, since Google Fonts does not have it', () => {
    TestBed.inject(FontStylesheets).load(BodyFont.OpenDyslexic, MonoFont.System);

    expect(stylesheets().filter((href) => href.includes('fontsource/opendyslexic'))).toHaveLength(2);
  });

  it.each(BUDGET)('never asks for more than $limit stylesheets for $body + $mono', ({ body, mono, limit }) => {
    TestBed.inject(FontStylesheets).load(body, mono);

    expect(stylesheets().length).toBeLessThanOrEqual(limit);
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
