import type { PathbuilderFileJson } from './pathbuilder-export';

/** Ready-made Pathbuilder exports, for trying the importer with one click. */
export const SampleCharacter = {
  Mordred: 'mordred',
  BriarRose: 'briar-rose',
} as const;

export type SampleCharacter = (typeof SampleCharacter)[keyof typeof SampleCharacter];

interface SampleModule {
  readonly default: PathbuilderFileJson;
}

/** Loaded on demand, so the exports stay out of the main bundle. */
const LOADERS: Readonly<Record<SampleCharacter, () => Promise<SampleModule>>> = {
  [SampleCharacter.Mordred]: async () => {
    const module: SampleModule = await import('./fixtures/mordred.json');

    return module;
  },
  [SampleCharacter.BriarRose]: async () => {
    const module: SampleModule = await import('./fixtures/briar-rose.json');

    return module;
  },
};

export const loadSampleExport = async (sample: SampleCharacter): Promise<PathbuilderFileJson> => {
  const module = await LOADERS[sample]();

  return module.default;
};
