/**
 * Writes each message scope's translation catalogs from its `en.json` (ADR-0084): `bun run i18n:extract [locale…]`.
 *
 * For every `{apps,libs}/** /src/i18n/en.json` and every target locale, `<locale>.json` is written beside it laid
 * out like `en`: translations already there are kept, messages `en` gained are added as empty strings (untranslated;
 * the loader drops them so `en` shows), and messages `en` lost are dropped. Nothing is merged by hand, and a second
 * run changes nothing.
 *
 * Targets are the locales named on the command line, or else every shipped locale but the source. A locale is named
 * on the command line to seed its catalogs before it is added to `Locale`.
 */
import { LOCALE_STATUS, LocaleStatus, SOURCE_LOCALE } from '@pioneer/shared/kernel';
import { Glob } from 'bun';

import { syncCatalog } from './message-keys.ts';
import type { MessageTree } from './message-keys.ts';

const BUNDLES = new Glob('{apps,libs}/**/src/i18n/en.json');

const shipped = Object.entries(LOCALE_STATUS)
  .filter(([, status]) => status !== LocaleStatus.Source)
  .map(([locale]) => locale);

const PRIMARY_SUBTAG = /^[a-z]{2,3}$/u;
const SUBTAG = /^[A-Za-z0-9]{2,8}$/u;

function isLocaleTag(tag: string): boolean {
  const [primary = '', ...rest] = tag.split('-');

  return PRIMARY_SUBTAG.test(primary) && rest.every((subtag) => SUBTAG.test(subtag));
}

const requested = Bun.argv.slice(2);
const invalid = requested.filter((tag) => !isLocaleTag(tag) || tag === SOURCE_LOCALE);

if (invalid.length > 0) {
  throw new Error(
    `Not a translation target locale (a language tag other than ${SOURCE_LOCALE}): ${invalid.join(', ')}`,
  );
}

const targets = requested.length > 0 ? requested : shipped;

async function readTree(path: string): Promise<MessageTree | undefined> {
  const file = Bun.file(path);
  const present = await file.exists();

  if (!present) {
    return undefined;
  }

  try {
    // SAFETY: a messages catalog is a JSON object of nested message strings, which is the `MessageTree` type.
    return (await file.json()) as MessageTree;
  } catch (error) {
    throw new Error(`${path} is not valid JSON`, { cause: error });
  }
}

/** Writes one catalog if it differs from what `en` now asks for; the path when it did. */
async function writeCatalog(sourcePath: string, source: MessageTree, locale: string): Promise<string | undefined> {
  const path = sourcePath.replace(/en\.json$/u, `${locale}.json`);
  const existing = await readTree(path);
  const next = `${JSON.stringify(syncCatalog(source, existing), undefined, 2)}\n`;
  const current = existing === undefined ? undefined : await Bun.file(path).text();

  if (current === next) {
    return undefined;
  }

  await Bun.write(path, next);

  return path;
}

const scanned = await Array.fromAsync(BUNDLES.scan({ dot: false }));
const bundles = scanned.filter((path) => !path.includes('node_modules'));

const written = await Promise.all(
  bundles.flatMap((bundle) =>
    targets.map(async (locale) => {
      const source = await readTree(bundle);

      return source === undefined ? undefined : writeCatalog(bundle, source, locale);
    }),
  ),
);

const changed = written.filter((path) => path !== undefined);

console.info(
  targets.length === 0
    ? 'No locale other than the source is shipped yet; name one to seed its catalogs.'
    : `${changed.length} catalog(s) written for ${targets.join(', ')}.`,
);
