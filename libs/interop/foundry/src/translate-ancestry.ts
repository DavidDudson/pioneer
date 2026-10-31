import { ContentKind, slugName } from '@pioneer/rules/sdk';
import type { ContentId, Size } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveSlug, resolveUuid } from './entry-references';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import {
  attributeSlots,
  featSlots,
  FOUNDRY_SIZES,
  FoundryAttributeSlots,
  FoundryGrantedItems,
  grantItems,
  systemOf,
} from './kind-fields';
import { ANCESTRY_FEAT_LEVELS } from './translate-class';

/**
 * An ancestry's `data` from Foundry's `ancestry` item, and a heritage's from its `heritage` item. Languages and vision
 * are `language` and `sense` entries by slug; the features an ancestry grants become `GrantItem` elements.
 */

export const ANCESTRY_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  'additionalLanguages',
  'boosts',
  'flaws',
  'hands',
  'hp',
  'items',
  'languages',
  'reach',
  'size',
  'speed',
  'vision',
]);

export const HERITAGE_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, 'ancestry']);

const FIELD_MAX = 64;
const NAME_MAX = 500;
const LANGUAGES_MAX = 64;

/** Foundry's vision for ordinary sight: no `sense` entry. */
const NORMAL_VISION = 'normal';

/** Every remaster ancestry has two hands; Foundry keeps the count for homebrew, and Pioneer has no field for it. */
const HANDS = 2;

const FoundryLanguages = z.looseObject({
  value: z.array(z.string().max(FIELD_MAX)).max(LANGUAGES_MAX).default([]),
  custom: z.string().max(NAME_MAX).default(''),
});

const FoundryAncestrySystem = z.looseObject({
  hp: z.number(),
  size: z.string().max(FIELD_MAX),
  speed: z.number(),
  reach: z.number(),
  hands: z.number().optional(),
  boosts: FoundryAttributeSlots.default({}),
  flaws: FoundryAttributeSlots.default({}),
  languages: FoundryLanguages.default({ value: [], custom: '' }),
  additionalLanguages: FoundryLanguages.extend({ count: z.number() }).default({ value: [], custom: '', count: 0 }),
  vision: z.string().max(FIELD_MAX).default(NORMAL_VISION),
  items: FoundryGrantedItems.default({}),
});
type FoundryLanguages = z.infer<typeof FoundryLanguages>;
type FoundryAncestrySystem = z.infer<typeof FoundryAncestrySystem>;

/** The `language` entries Foundry's slugs name; free text Foundry allows beside them is reported. */
function languagesOf({ value, custom }: FoundryLanguages, field: string, { references, log }: KindInput): ContentId[] {
  if (custom.trim() !== '') {
    report(log, { reason: KindDataGapReason.UnmappedField, field: `${field}.custom`, raw: custom });
  }
  return value.flatMap((slug) => {
    const id = resolveSlug(references, ContentKind.Language, slug);
    if (id === undefined) {
      report(log, { reason: KindDataGapReason.UnresolvedReference, field: `${field}.value`, raw: slug });
    }
    return id === undefined ? [] : [id];
  });
}

function visionOf(vision: string, { references, log }: KindInput): object {
  if (vision === NORMAL_VISION) {
    return {};
  }
  const sense = resolveSlug(references, ContentKind.Sense, vision);
  if (sense === undefined) {
    report(log, { reason: KindDataGapReason.UnresolvedReference, field: 'vision', raw: vision });
  }
  return sense === undefined ? {} : { vision: sense };
}

/** Foundry's size, mapped; an unknown size, or hands other than two, is reported. */
function sizeOf({ size, hands }: FoundryAncestrySystem, log: GapLog): Size | undefined {
  const mapped = FOUNDRY_SIZES.get(size);
  if (mapped === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'size', raw: size });
  }
  if (hands !== undefined && hands !== HANDS) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'hands', raw: hands });
  }
  return mapped;
}

/** Ancestry feat slots on Player Core's schedule: feats with the ancestry's trait. */
function ancestryFeatSlots(input: KindInput): void {
  const trait = slugName(input.envelope.slug);
  const prompt = `${input.envelope.name} feat`;
  featSlots({ slot: 'ancestry-feat', trait, prompt, field: 'ancestryFeatLevels' }, ANCESTRY_FEAT_LEVELS, input);
}

/** The ancestry's data, unparsed; undefined when its `system` is not shaped as an ancestry's. */
export function ancestryData(input: KindInput): object | undefined {
  const system = systemOf(FoundryAncestrySystem, input);
  if (system === undefined) {
    return undefined;
  }
  const { log } = input;
  grantItems(system.items, 'items', input);
  ancestryFeatSlots(input);
  return {
    hitPoints: system.hp,
    size: sizeOf(system, log),
    speed: system.speed,
    reach: system.reach,
    boosts: attributeSlots(system.boosts, 'boosts', log),
    flaws: attributeSlots(system.flaws, 'flaws', log).flat(),
    languages: languagesOf(system.languages, 'languages', input),
    additionalLanguages: {
      count: system.additionalLanguages.count,
      options: languagesOf(system.additionalLanguages, 'additionalLanguages', input),
    },
    ...visionOf(system.vision, input),
  };
}

/** The ancestry a heritage belongs to; `null` for a versatile heritage. */
const FoundryHeritageSystem = z.looseObject({
  ancestry: z.looseObject({ uuid: z.string().max(NAME_MAX), slug: z.string().max(FIELD_MAX).nullish() }).nullish(),
});

/**
 * The heritage's data, unparsed. Its ancestry resolves by UUID among the selected documents, else by slug among
 * the other packs' entries (a heritage imported after its ancestry).
 */
export function heritageData(input: KindInput): object | undefined {
  const system = systemOf(FoundryHeritageSystem, input);
  const ancestry = system?.ancestry;
  if (system === undefined) {
    return undefined;
  }
  if (ancestry === null || ancestry === undefined) {
    return {};
  }
  const { references, log } = input;
  const id =
    resolveUuid(references, ancestry.uuid) ??
    (ancestry.slug === null || ancestry.slug === undefined
      ? undefined
      : resolveSlug(references, ContentKind.Ancestry, ancestry.slug));
  if (id === undefined) {
    report(log, { reason: KindDataGapReason.UnresolvedReference, field: 'ancestry', raw: ancestry.uuid });
  }
  return id === undefined ? {} : { ancestry: id };
}
