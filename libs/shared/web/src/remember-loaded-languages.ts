import type { TranslocoService } from '@jsverse/transloco';

/** The part of `TranslocoService` that is private in its typings but that the translate pipe calls. */
export interface CountsLoadedKeys {
  /** How many message keys the language has, so `0` when it is not loaded. */
  isLoadedTranslation: (lang: string) => number;
}

/**
 * Transloco's `isLoadedTranslation` counts every key of a language's messages, and the translate pipe asks it each time
 * it resolves a feature scope. With the shell's messages and a page full of pipes that took about 0.4 s of a sheet's
 * load. Messages are only ever added, so once a language has some it stays loaded: this has `service` remember the
 * count it found instead of counting again.
 */
export function rememberLoadedLanguages(service: TranslocoService): void {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the method exists at runtime; only its typings hide it
  const counting = service as unknown as CountsLoadedKeys;
  const count = counting.isLoadedTranslation.bind(service);
  const remembered = new Map<string, number>();
  counting.isLoadedTranslation = (lang: string): number => {
    const known = remembered.get(lang);
    if (known !== undefined) {
      return known;
    }
    const keys = count(lang);
    if (keys > 0) {
      remembered.set(lang, keys);
    }
    return keys;
  };
}
