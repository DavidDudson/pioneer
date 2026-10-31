import { RITUALS_MAX, UNPLACED_FEATS_MAX, UNPLACED_LANGUAGES_MAX } from '@pioneer/character/domain';
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

/** What an import found that the build keeps: the feats no slot took, the languages, and the rituals. */
export interface ImportedPicks {
  readonly feats: readonly ImportedFeat[];
  readonly languages: readonly PathbuilderName[];
  readonly rituals: readonly PathbuilderName[];
}

/**
 * The feats and languages no slot took that matched loaded content, as the build keeps them: flagged as breaking a
 * rule, never forced into a slot. The rituals that matched come with them, kept as known.
 */
export function keptPicks(imported: ImportedPicks, lookup: ContentLookup): UnplacedPicks {
  const { feats, languages, rituals } = imported;
  return {
    unplacedFeats: kept(
      ImportKind.Feat,
      feats.map(({ name }) => name),
      lookup,
    ).slice(0, UNPLACED_FEATS_MAX),
    unplacedLanguages: kept(ImportKind.Language, languages, lookup).slice(0, UNPLACED_LANGUAGES_MAX),
    rituals: kept(ImportKind.Ritual, rituals, lookup).slice(0, RITUALS_MAX),
  };
}
