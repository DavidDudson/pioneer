import {
  ActionData,
  BlockKind,
  FeatCategory,
  InlineKind,
  RichTextString,
  Slug,
  Trait,
  UNLIMITED,
} from '@pioneer/rules/sdk';
import type { ContentId, RichText } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { issuePath, KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { setFields, systemOf } from './kind-fields';
import { ACTION_FIELDS, actionData } from './translate-action';
import type { ArchetypeLink } from './translate-archetype';
import { spellcastingRules } from './translate-spellcasting';

/**
 * A feat's `data` from Foundry's `feat` item, and a class feature's from a `feat` item of category `classfeature`
 * (content-model.md, "Feats"). A feat used as an action carries the `action` kind's data, read as the action
 * translator reads an `action` item. Foundry's other feature categories have no kind yet and are reported.
 */

export const FEAT_FIELDS: ReadonlySet<string> = new Set([
  ...ACTION_FIELDS,
  'actionCategory',
  'maxTakable',
  'onlyLevel1',
  'prerequisites',
]);

const FIELD_MAX = 64;
const NAME_MAX = 1000;
const PREREQUISITES_MAX = 16;
const TAGS_MAX = 16;

const FeatCategorySchema = z.enum(FeatCategory);

const FoundryPrerequisite = z.looseObject({ value: z.string().max(NAME_MAX) });

const FoundryTags = z.array(z.string().max(FIELD_MAX)).max(TAGS_MAX);

const FoundryFeatSystem = z.looseObject({
  category: z.string().max(FIELD_MAX).nullish(),
  actionCategory: z.looseObject({ value: z.string().max(FIELD_MAX).nullish() }).nullish(),
  prerequisites: z.looseObject({ value: z.array(FoundryPrerequisite).max(PREREQUISITES_MAX) }).optional(),
  onlyLevel1: z.boolean().optional(),
  maxTakable: z.number().int().positive().nullish(),
  traits: z.looseObject({ otherTags: FoundryTags.optional() }).optional(),
});
type FoundryFeatSystem = z.infer<typeof FoundryFeatSystem>;

/** A class feature's `otherTags` as tags (`cleric-doctrine`); a tag that is no slug is reported and left off. */
function tagsOf(system: FoundryFeatSystem, { log }: KindInput): object {
  const tags = (system.traits?.otherTags ?? []).flatMap((tag): Slug[] => {
    const slug = Slug.safeParse(tag);
    if (!slug.success) {
      report(log, { reason: KindDataGapReason.UnmappedValue, field: 'traits.otherTags', raw: tag });
    }
    return slug.success ? [slug.data] : [];
  });
  return tags.length === 0 ? {} : { tags: [...new Set(tags)] };
}

/** A passive feat with nothing an action carries: no `action` data. */
function isEmpty(data: object): boolean {
  return Object.keys(data).length === 0;
}

/**
 * The feat's `action` data, read with its action category where the action translator expects `category` (which on
 * a feat is the feat's own). Absent for a passive feat, or when its cost has no mapping (already reported). Action
 * data its schema rejects (a reaction whose trigger was left for the rich text stories) is reported and left off, so
 * the rest of the feat still imports.
 */
function actionOf(system: FoundryFeatSystem, input: KindInput): object {
  const { document, log } = input;
  const category = system.actionCategory?.value ?? undefined;
  const action = actionData({ ...input, document: { ...document, system: { ...document.system, category } } });
  if (action === undefined || isEmpty(action)) {
    return {};
  }
  const parsed = ActionData.safeParse(action);
  if (!parsed.success) {
    report(log, { reason: KindDataGapReason.InvalidData, field: `action.${issuePath(parsed.error)}`, raw: action });
  }
  return parsed.success ? { action: parsed.data } : {};
}

/** Foundry's prerequisites, as printed, one paragraph; undefined when there are none. */
function prerequisitesOf({ prerequisites }: FoundryFeatSystem): RichText | undefined {
  const text = RichTextString.safeParse((prerequisites?.value ?? []).map(({ value }) => value.trim()).join('; '));
  return text.success
    ? [{ type: BlockKind.Paragraph, content: [{ type: InlineKind.Text, text: text.data }] }]
    : undefined;
}

/** Once when absent or 1, as in Foundry; Foundry's explicit `null` is any number of times. */
function maxTakableOf({ maxTakable }: FoundryFeatSystem): number | string | undefined {
  if (maxTakable === null) {
    return UNLIMITED;
  }
  return maxTakable === 1 ? undefined : maxTakable;
}

const ARCHETYPE = Trait.parse('archetype');

/** The one link left, or none when several or none are. */
function narrowed(links: readonly ArchetypeLink[]): readonly ArchetypeLink[] {
  return links.length === 1 ? links : [];
}

/**
 * The archetype an archetype feat belongs to: the one archetype page linking it, or of several (a feat shared by
 * archetypes), the one whose dedication its prerequisites name. None, or several with none named, is reported.
 */
function archetypeOf(system: FoundryFeatSystem, { envelope, archetypes, log }: KindInput): ContentId | undefined {
  if (!envelope.traits.includes(ARCHETYPE)) {
    return undefined;
  }
  const links = archetypes.get(envelope.id) ?? [];
  const prerequisites = (system.prerequisites?.value ?? []).map(({ value }) => value.toLowerCase());
  const named = links.filter(({ dedication }) =>
    prerequisites.some((prerequisite) => prerequisite.includes(dedication.toLowerCase())),
  );
  const [only] = links.length === 1 ? links : narrowed(named);
  if (only === undefined) {
    const reason = links.length === 0 ? KindDataGapReason.UnresolvedReference : KindDataGapReason.UnmappedValue;
    report(log, { reason, field: 'archetype', raw: links.map(({ dedication }) => dedication) });
  }
  return only?.archetype;
}

/** The feat's data, unparsed; undefined when its `system` is not shaped as a feat's or its category has no slot. */
export function featData(input: KindInput): object | undefined {
  spellcastingRules(input);
  const system = systemOf(FoundryFeatSystem, input);
  if (system === undefined) {
    return undefined;
  }
  const category = FeatCategorySchema.safeParse(system.category);
  if (!category.success) {
    report(input.log, { reason: KindDataGapReason.UnmappedValue, field: 'category', raw: system.category });
    return undefined;
  }
  return {
    category: category.data,
    ...setFields({
      prerequisites: prerequisitesOf(system),
      onlyLevel1: system.onlyLevel1 === true ? true : undefined,
      maxTakable: maxTakableOf(system),
      archetype: archetypeOf(system, input),
    }),
    ...actionOf(system, input),
  };
}

/** The class feature's data, unparsed: its `action` data when it is itself an action, and its tags. */
export function classFeatureData(input: KindInput): object | undefined {
  spellcastingRules(input);
  const system = systemOf(FoundryFeatSystem, input);
  return system === undefined ? undefined : { ...actionOf(system, input), ...tagsOf(system, input) };
}
