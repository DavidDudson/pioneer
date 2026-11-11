import {
  CLASS_FEATURES_MAX,
  customLanguagesOf,
  RITUALS_MAX,
  UNPLACED_FEATS_MAX,
  UNPLACED_LANGUAGES_MAX,
  UNPLACED_SPELLS_MAX,
} from '@pioneer/character/domain';
import type { UnplacedPicks } from '@pioneer/character/domain';
import { ImportKind } from '@pioneer/interop/pathbuilder';
import type { ContentLookup, ImportedFeat, PathbuilderName } from '@pioneer/interop/pathbuilder';
import { ContentId } from '@pioneer/rules/sdk';

/** The content `names` match, each once; a name that matched none is left out. */
function kept(kind: ImportKind, names: readonly PathbuilderName[], lookup: ContentLookup): ContentId[] {
  const ids = names.flatMap((name): ContentId[] => {
    const match = lookup.resolve(kind, name);
    return match === undefined ? [] : [ContentId.parse(match.id)];
  });
  return [...new Set(ids)];
}

/** What an import found that the build keeps: the feats and spells no slot took, the languages, the rituals, the class features and the deity. */
export interface ImportedPicks {
  readonly feats: readonly ImportedFeat[];
  readonly languages: readonly PathbuilderName[];
  /** The languages no loaded content defines, kept by name. */
  readonly customLanguages: readonly PathbuilderName[];
  readonly rituals: readonly PathbuilderName[];
  readonly classFeatures: readonly PathbuilderName[];
  readonly deity: PathbuilderName | undefined;
  /** The spells no prepared, repertoire or innate slot took. */
  readonly spells: readonly PathbuilderName[];
}

/**
 * The feats and languages no slot took that matched loaded content, as the build keeps them: flagged as breaking a
 * rule, never forced into a slot. The rituals, class features and deity that matched come with them, kept as known, and the
 * spells no slot took, flagged the same way.
 */
export function keptPicks(imported: ImportedPicks, lookup: ContentLookup): UnplacedPicks {
  const { feats, languages, customLanguages, rituals, classFeatures, deity, spells } = imported;
  const deityIds = deity === undefined ? [] : kept(ImportKind.Deity, [deity], lookup);
  return {
    unplacedFeats: kept(
      ImportKind.Feat,
      feats.map(({ name }) => name),
      lookup,
    ).slice(0, UNPLACED_FEATS_MAX),
    unplacedLanguages: kept(ImportKind.Language, languages, lookup).slice(0, UNPLACED_LANGUAGES_MAX),
    customLanguages: [...customLanguagesOf(customLanguages)],
    rituals: kept(ImportKind.Ritual, rituals, lookup).slice(0, RITUALS_MAX),
    classFeatures: kept(ImportKind.ClassFeature, classFeatures, lookup).slice(0, CLASS_FEATURES_MAX),
    deity: deityIds[0],
    unplacedSpells: kept(ImportKind.Spell, spells, lookup).slice(0, UNPLACED_SPELLS_MAX),
  };
}
