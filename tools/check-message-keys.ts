/**
 * Fails when the message catalogs and the code disagree (ADR-0009, ADR-0084).
 *
 * The `en` source locale: a key used in code but missing from `en`, or an `en` key nothing uses.
 *
 * Every other locale's catalog, `<locale>.json` beside an `en.json`: a stale key `en` no longer has, invalid ICU, a
 * translation that drops or invents a parameter, and, for each shipped locale, a shell, `identity` or `character`
 * scope that is not fully translated. A message not translated yet is a coverage figure, not a failure.
 *
 * Bundles are every `{apps,libs}/** /src/i18n/en.json`. A lib that calls
 * `provideMessageScope('<scope>', …)` owns a scope, so its keys are
 * prefixed `<scope>.`; other bundles are root messages, already namespaced.
 * Usage is any quoted key-shaped literal in non-test TypeScript or HTML whose
 * first segment is a known namespace, which also covers keys held in const
 * objects (`ProblemMessage.NotFound`). Keys built at runtime cannot be seen,
 * so code spells keys out in full.
 */
import { LOCALE_STATUS, LocaleStatus } from '@pioneer/shared/kernel';
import { Glob } from 'bun';

import {
  catalogProblems,
  compareKeys,
  coverage,
  findKeyLiterals,
  flattenMessages,
  isComplete,
  isCoreScope,
  localeChain,
  scopeOf,
  SourceKind,
} from './message-keys.ts';
import type { Coverage, MessageTree } from './message-keys.ts';

const BUNDLES = new Glob('{apps,libs}/**/src/i18n/en.json');
const CATALOGS = new Glob('{apps,libs}/**/src/i18n/*.json');
const SOURCES = new Glob('{apps,libs}/**/src/**/*.{ts,html}');
const TEST_FILE = /\.(?:spec|test)\.ts$|\/testing\//u;
const SOURCE_FILE = 'en.json';

async function read(path: string): Promise<string> {
  return Bun.file(path).text();
}

async function scan(glob: Glob): Promise<Array<string>> {
  const paths = await Array.fromAsync(glob.scan({ dot: false }));

  return paths.filter((path) => !path.includes('node_modules'));
}

async function readTree(path: string): Promise<MessageTree> {
  const text = await read(path);

  try {
    // SAFETY: a messages bundle is a JSON object of nested message strings, which is the `MessageTree` type.
    return JSON.parse(text) as MessageTree;
  } catch (error) {
    throw new Error(`${path} is not valid JSON`, { cause: error });
  }
}

const allSourcePaths = await scan(SOURCES);
const sourcePaths = allSourcePaths.filter((path) => !TEST_FILE.test(path));
const sources = new Map(await Promise.all(sourcePaths.map(async (path) => [path, await read(path)] as const)));

/** A bundle's folder and the scope it loads under, `undefined` for root (shell) messages. */
interface Bundle {
  readonly dir: string;
  readonly scope: string | undefined;
  readonly tree: MessageTree;
}

async function loadBundle(path: string): Promise<Bundle> {
  const dir = path.slice(0, path.length - SOURCE_FILE.length - 1);
  const projectSrc = path.slice(0, path.indexOf('/i18n/en.json'));

  const projectSources = sources
    .entries()
    .filter(([sourcePath]) => sourcePath.startsWith(`${projectSrc}/`))
    .map(([, text]) => text)
    .toArray();

  return { dir, scope: scopeOf(projectSources), tree: await readTree(path) };
}

const bundlePaths = await scan(BUNDLES);
const bundles = await Promise.all(bundlePaths.map(async (path) => loadBundle(path)));
const defined = new Set(bundles.flatMap(({ scope, tree }) => flattenMessages(tree, scope ?? '')));
const namespaces = new Set([...defined].map((key) => key.split('.')[0] ?? ''));
const kindOf = (path: string): SourceKind => (path.endsWith('.html') ? SourceKind.Template : SourceKind.TypeScript);
const used = new Set([...sources].flatMap(([path, text]) => findKeyLiterals(text, kindOf(path), namespaces)));
const { missing, unused } = compareKeys(defined, used);

const problems = [...missing.map((key) => `missing from en: ${key}`), ...unused.map((key) => `unused in code: ${key}`)];

/** Every non-source catalog on disk, by path. */
const scannedCatalogs = await scan(CATALOGS);
const catalogPaths = scannedCatalogs.filter((path) => !path.endsWith(`/${SOURCE_FILE}`));
const catalogTrees = await Promise.all(catalogPaths.map(async (path) => readTree(path)));
const catalogs = new Map(catalogPaths.map((path, index) => [path, catalogTrees[index] ?? {}]));

const locales = new Set(catalogPaths.map((path) => path.slice(path.lastIndexOf('/') + 1, -'.json'.length)));

const shipped = new Set(
  Object.entries(LOCALE_STATUS)
    .filter(([, status]) => status !== LocaleStatus.Source)
    .map(([locale]) => locale),
);

/** What one locale's catalogs say about one bundle: how much they translate, and what is wrong with them. */
interface BundleCheck {
  readonly covered: Coverage;
  readonly issues: ReadonlyArray<string>;
}

function checkBundle(locale: string, { dir, scope, tree }: Bundle): BundleCheck {
  const chain = localeChain(locale).map((tag) => catalogs.get(`${dir}/${tag}.json`) ?? {});
  const own = catalogs.get(`${dir}/${locale}.json`);
  const covered = coverage(tree, chain);

  const issues =
    own === undefined ? [] : catalogProblems(tree, own).map((problem) => `${dir}/${locale}.json: ${problem}`);

  const missesCoreBar = shipped.has(locale) && isCoreScope(scope) && !isComplete(covered);

  return {
    covered,
    issues: missesCoreBar
      ? [
          ...issues,
          `${dir}/${locale}.json: core scope "${scope ?? 'shell'}" is ${covered.translated}/${covered.total} ` +
            `translated, a shipped locale needs all of it (ADR-0084)`,
        ]
      : issues,
  };
}

const PERCENT = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });

for (const locale of new Set([...locales, ...shipped])) {
  const results = bundles.map((bundle) => checkBundle(locale, bundle));
  const translated = results.reduce((sum, { covered }) => sum + covered.translated, 0);
  const total = results.reduce((sum, { covered }) => sum + covered.total, 0);

  problems.push(...results.flatMap(({ issues }) => issues));
  console.info(
    `${locale}: ${PERCENT.format(total === 0 ? 1 : translated / total)} translated (${translated}/${total}); the rest shows en`,
  );
}

if (problems.length > 0) {
  throw new Error(`Message catalogs out of sync with the en source locale:\n- ${problems.join('\n- ')}`);
}
