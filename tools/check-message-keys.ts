/**
 * Fails when the `en` source locale and the code disagree (ADR-0009):
 * a key used in code but missing from `en`, or an `en` key nothing uses.
 *
 * Bundles are every `{apps,libs}/** /src/i18n/en.json`. A lib that calls
 * `provideMessageScope('<scope>', …)` owns a scope, so its keys are
 * prefixed `<scope>.`; other bundles are root messages, already namespaced.
 * Usage is any quoted key-shaped literal in non-test TypeScript or HTML whose
 * first segment is a known namespace, which also covers keys held in const
 * objects (`ProblemMessage.NotFound`). Keys built at runtime cannot be seen,
 * so code spells keys out in full.
 */
import { Glob } from 'bun';

import { compareKeys, findKeyLiterals, flattenMessages, scopeOf, SourceKind } from './message-keys.ts';
import type { MessageTree } from './message-keys.ts';

const BUNDLES = new Glob('{apps,libs}/**/src/i18n/en.json');
const SOURCES = new Glob('{apps,libs}/**/src/**/*.{ts,html}');
const TEST_FILE = /\.(?:spec|test)\.ts$|\/testing\//u;

async function read(path: string): Promise<string> {
  return Bun.file(path).text();
}

async function scan(glob: Glob): Promise<string[]> {
  const paths = await Array.fromAsync(glob.scan({ dot: false }));
  return paths.filter((path) => !path.includes('node_modules'));
}

const allSourcePaths = await scan(SOURCES);
const sourcePaths = allSourcePaths.filter((path) => !TEST_FILE.test(path));
const sources = new Map(await Promise.all(sourcePaths.map(async (path) => [path, await read(path)] as const)));

async function bundleKeys(bundle: string): Promise<string[]> {
  const projectSrc = bundle.slice(0, bundle.indexOf('/i18n/en.json'));
  const projectSources = [...sources].filter(([path]) => path.startsWith(`${projectSrc}/`)).map(([, text]) => text);
  const tree = JSON.parse(await read(bundle)) as MessageTree;
  return flattenMessages(tree, scopeOf(projectSources) ?? '');
}

const bundles = await scan(BUNDLES);
const keysPerBundle = await Promise.all(bundles.map(async (bundle) => bundleKeys(bundle)));
const defined = new Set(keysPerBundle.flat());
const namespaces = new Set([...defined].map((key) => key.split('.')[0] ?? ''));
const kindOf = (path: string): SourceKind => (path.endsWith('.html') ? SourceKind.Template : SourceKind.TypeScript);
const used = new Set([...sources].flatMap(([path, text]) => findKeyLiterals(text, kindOf(path), namespaces)));
const { missing, unused } = compareKeys(defined, used);

const problems = [...missing.map((key) => `missing from en: ${key}`), ...unused.map((key) => `unused in code: ${key}`)];
if (problems.length > 0) {
  throw new Error(`Message keys out of sync with the en source locale:\n- ${problems.join('\n- ')}`);
}
