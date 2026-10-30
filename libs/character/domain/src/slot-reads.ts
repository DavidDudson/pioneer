import { grantLookup, resolveGrants } from '@pioneer/rules/grants';
import type { ContentLookup, GrantResolution, GrantRoot, RootSlotDefinition } from '@pioneer/rules/grants';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry, RollOption, VariantRuleEntry } from '@pioneer/rules/sdk';

import { boostContent } from './attribute-boosts';
import type { BoostContent } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { characterRootSlots, variantGrantRoots } from './character-slots';
import { featContent } from './feat-content';
import type { FeatContent } from './feat-content';
import { languageContent } from './language-content';
import type { LanguageContent } from './language-content';
import type { LanguageReads } from './language-levels';
import type { PreparedReads } from './prepared-spells';
import { skillContent } from './skill-content';
import type { SkillContent } from './skill-content';
import type { GrantsAt } from './skill-grants';
import type { SkillReads } from './skill-training';
import { spellContent } from './spell-content';
import type { SpellContent } from './spell-content';

/**
 * The content a slot's offer is read from: entries by id and kind, how roll option namespaces read, and the boosts
 * of each ancestry, background and class, the skills and Lores a skill slot offers, the languages, the spells a
 * prepared slot offers and the feats a feat slot offers.
 */
export interface SlotContent {
  readonly lookup: ContentLookup;
  readonly namespaces: NamespaceTable;
  /** The slots the character has itself: the second class's too while Dual Class is in force. */
  readonly rootSlots: readonly RootSlotDefinition[];
  /** The variant rules in force that add slots of their own (Free Archetype's feat slots), as grant roots. */
  readonly variantRoots: readonly GrantRoot[];
  readonly boosts: BoostContent;
  readonly skills: SkillContent;
  readonly languages: LanguageContent;
  readonly spells: SpellContent;
  readonly feats: FeatContent;
  /** The roll options a roll supplies (an initiative roll's), which the facts every predicate reads include. */
  readonly situation?: readonly RollOption[] | undefined;
}

/** The slot content a registry gives, for a character with `variants` in force. */
export function slotContent(registry: ContentRegistry, variants: readonly VariantRuleEntry[] = []): SlotContent {
  const rootSlots = characterRootSlots(variants);
  return {
    lookup: grantLookup(registry),
    namespaces: registry.rollOptionNamespaces(),
    rootSlots,
    variantRoots: variantGrantRoots(variants),
    boosts: boostContent(registry, rootSlots),
    skills: skillContent(registry),
    languages: languageContent(registry),
    spells: spellContent(registry),
    feats: featContent(registry),
  };
}

/** What slots are read against: the character's picks and the content. */
export interface SlotContext extends SlotContent {
  readonly picks: ReadonlyMap<SlotKey, ChoiceValue>;
}

/** The character's grants at `level` over `picks`, with its own slots as roots. */
export function resolveSlotsAt(
  level: Level,
  { picks, lookup, namespaces, rootSlots, variantRoots }: SlotContext,
): GrantResolution {
  return resolveGrants({
    roots: variantRoots,
    lookup,
    level,
    situation: [],
    picks,
    toggles: new Map(),
    rootSlots,
    namespaces,
  });
}

/** The character's picks, by slot. */
export function picksOf(document: CharacterDocument): ReadonlyMap<SlotKey, ChoiceValue> {
  return new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value]));
}

/** Grants already resolved, by content, document and level: documents and content are never changed in place. */
const RESOLVED = new WeakMap<SlotContent, WeakMap<CharacterDocument, Map<Level, GrantResolution>>>();

function resolvedFor(document: CharacterDocument, content: SlotContent): Map<Level, GrantResolution> {
  const byDocument = RESOLVED.get(content) ?? new WeakMap<CharacterDocument, Map<Level, GrantResolution>>();
  RESOLVED.set(content, byDocument);
  const resolved = byDocument.get(document) ?? new Map<Level, GrantResolution>();
  byDocument.set(document, resolved);
  return resolved;
}

/**
 * What skill slots read: the skills and boosts content, and the character's grants at each level, each resolved once
 * for the same content and document, however many reads ask.
 */
export function skillReads(document: CharacterDocument, content: SlotContent): SkillReads {
  const context: SlotContext = { ...content, picks: picksOf(document) };
  const resolved = resolvedFor(document, content);
  const grantsAt: GrantsAt = (level) => {
    const resolution = resolved.get(level) ?? resolveSlotsAt(level, context);
    resolved.set(level, resolution);
    return resolution;
  };
  return { skills: content.skills, boosts: content.boosts, grantsAt };
}

/** What language slots read: the languages content and namespaces, and the skill reads, grants resolved once. */
export function languageReads(document: CharacterDocument, content: SlotContent): LanguageReads {
  return { languages: content.languages, namespaces: content.namespaces, skills: skillReads(document, content) };
}

/**
 * What prepared slots read: the spells, and the character's grants at `at` (its level unless a later one is asked) over
 * every pick it holds.
 */
export function preparedReads(
  document: CharacterDocument,
  content: SlotContent,
  at: Level = Level.parse(document.level),
): PreparedReads {
  const resolved = resolvedFor(document, content);
  const resolution = resolved.get(at) ?? resolveSlotsAt(at, { ...content, picks: picksOf(document) });
  resolved.set(at, resolution);
  return { spells: content.spells, resolution, lookup: content.lookup };
}
