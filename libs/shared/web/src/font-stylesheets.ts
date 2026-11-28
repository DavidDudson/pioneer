import { DOCUMENT, inject, Injectable } from '@angular/core';
import { BodyFont, MonoFont } from '@pioneer/shared/kernel';

const GOOGLE_FONTS = 'https://fonts.googleapis.com/css2';
const GOOGLE_FONT_FILES = 'https://fonts.gstatic.com';
const FONTSOURCE = 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5';

/** `family` orders the request (`css2` wants families sorted by name); `spec` is the part after `family=`. */
interface FamilySpec {
  readonly family: string;
  readonly spec: string;
}

const FRAUNCES: FamilySpec = { family: 'Fraunces', spec: 'Fraunces:opsz,wght@9..144,400..700' };

const CRIMSON_PRO: FamilySpec = { family: 'Crimson Pro', spec: 'Crimson+Pro:ital,wght@0,400..700;1,400..700' };

const ATKINSON: FamilySpec = {
  family: 'Atkinson Hyperlegible Next',
  spec: 'Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800',
};

const LEXEND: FamilySpec = { family: 'Lexend', spec: 'Lexend:wght@400..700' };

const FIRA_CODE: FamilySpec = { family: 'Fira Code', spec: 'Fira+Code:wght@400..700' };

const COURIER_PRIME: FamilySpec = {
  family: 'Courier Prime',
  spec: 'Courier+Prime:ital,wght@0,400;0,700;1,400;1,700',
};

/** OpenDyslexic is not on Google Fonts, so `FONTSOURCE_STYLESHEETS` serves it; the device's faces need nothing. */
const BODY_FAMILIES: Readonly<Record<BodyFont, ReadonlyArray<FamilySpec>>> = {
  [BodyFont.Thematic]: [FRAUNCES, CRIMSON_PRO, ATKINSON],
  [BodyFont.Readable]: [FRAUNCES, ATKINSON],
  [BodyFont.Lexend]: [FRAUNCES, LEXEND],
  [BodyFont.OpenDyslexic]: [FRAUNCES],
  [BodyFont.System]: [],
};

const FONTSOURCE_STYLESHEETS: Readonly<Partial<Record<BodyFont, ReadonlyArray<string>>>> = {
  [BodyFont.OpenDyslexic]: [`${FONTSOURCE}/400.css`, `${FONTSOURCE}/700.css`],
};

const MONO_FAMILIES: Readonly<Record<MonoFont, ReadonlyArray<FamilySpec>>> = {
  [MonoFont.Standard]: [FIRA_CODE],
  [MonoFont.Typewriter]: [COURIER_PRIME],
  [MonoFont.System]: [],
};

/** One `css2` URL for every family the choices need, so the faces cost a single request. */
function googleStylesheet(families: ReadonlyArray<FamilySpec>): ReadonlyArray<string> {
  if (families.length === 0) {
    return [];
  }

  const query = families
    .toSorted((first, second) => (first.family < second.family ? -1 : 1))
    .map(({ spec }) => `family=${spec}`)
    .join('&');

  return [`${GOOGLE_FONTS}?${query}&display=swap`];
}

/** The wordmark only: `text=` asks for just the letters of "Pioneer", a few hundred bytes. */
const BRAND_STYLESHEET = `${GOOGLE_FONTS}?family=Pirata+One&text=Pioneer&display=swap`;

/**
 * Loads typeface stylesheets when a face is first shown, never twice. A failed or blocked request leaves the
 * fallback in the font stack showing, so text stays readable offline.
 */
@Injectable({ providedIn: 'root' })
export class FontStylesheets {
  readonly #document = inject(DOCUMENT);
  readonly #loaded = new Set<string>();

  /** Makes sure the wordmark face and the faces the chosen body and mono fonts need are on their way. */
  public load(body: BodyFont, mono: MonoFont): void {
    const urls = [
      BRAND_STYLESHEET,
      ...googleStylesheet([...BODY_FAMILIES[body], ...MONO_FAMILIES[mono]]),
      ...(FONTSOURCE_STYLESHEETS[body] ?? []),
    ];

    if (urls.some((url) => !this.#loaded.has(url))) {
      this.#preconnect(GOOGLE_FONTS.replace('/css2', ''));
      this.#preconnect(GOOGLE_FONT_FILES, true);
    }

    for (const url of urls) {
      this.#stylesheet(url);
    }
  }

  #stylesheet(url: string): void {
    if (this.#loaded.has(url)) {
      return;
    }

    this.#loaded.add(url);
    const link = this.#document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    this.#document.head.append(link);
  }

  #preconnect(origin: string, crossOrigin = false): void {
    if (this.#loaded.has(origin)) {
      return;
    }

    this.#loaded.add(origin);
    const link = this.#document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;

    if (crossOrigin) {
      link.crossOrigin = '';
    }

    this.#document.head.append(link);
  }
}
