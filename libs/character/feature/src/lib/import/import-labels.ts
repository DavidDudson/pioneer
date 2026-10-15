import { BadgeTone } from '@pioneer/frontier';
import { ImportKind, MatchStatus, UncarriedField, UnmatchedReason } from '@pioneer/interop/pathbuilder';

/** Label key per import kind, shared by the preview and the post-import report. */
export const KIND_KEYS: Readonly<Record<ImportKind, string>> = {
  [ImportKind.Ancestry]: 'character.import.kind.ancestry',
  [ImportKind.Heritage]: 'character.import.kind.heritage',
  [ImportKind.Background]: 'character.import.kind.background',
  [ImportKind.Class]: 'character.import.kind.class',
  [ImportKind.Deity]: 'character.import.kind.deity',
  [ImportKind.Feat]: 'character.import.kind.feat',
  [ImportKind.ClassFeature]: 'character.import.kind.classFeature',
  [ImportKind.Spell]: 'character.import.kind.spell',
  [ImportKind.Ritual]: 'character.import.kind.ritual',
  [ImportKind.Item]: 'character.import.kind.item',
  [ImportKind.Language]: 'character.import.kind.language',
};

/** Label key per field the character can't hold yet: the kinds' labels, plus lores. */
export const UNCARRIED_KEYS: Readonly<Record<UncarriedField, string>> = {
  [UncarriedField.Deity]: KIND_KEYS[ImportKind.Deity],
  [UncarriedField.Feat]: KIND_KEYS[ImportKind.Feat],
  [UncarriedField.ClassFeature]: KIND_KEYS[ImportKind.ClassFeature],
  [UncarriedField.Spell]: KIND_KEYS[ImportKind.Spell],
  [UncarriedField.Ritual]: KIND_KEYS[ImportKind.Ritual],
  [UncarriedField.Language]: KIND_KEYS[ImportKind.Language],
  [UncarriedField.Lore]: 'character.import.kind.lore',
};

export const STATUS_KEYS: Readonly<Record<MatchStatus, string>> = {
  [MatchStatus.Matched]: 'character.import.status.matched',
  [MatchStatus.Unmatched]: 'character.import.status.unmatched',
  [MatchStatus.KindNotLoaded]: 'character.import.status.kindNotLoaded',
};

export const STATUS_TONES: Readonly<Record<MatchStatus, BadgeTone>> = {
  [MatchStatus.Matched]: BadgeTone.Success,
  [MatchStatus.Unmatched]: BadgeTone.Warning,
  [MatchStatus.KindNotLoaded]: BadgeTone.Neutral,
};

/** Label key per reason the post-import report gives: the preview's, plus a match its slot doesn't offer. */
export const REASON_KEYS: Readonly<Record<UnmatchedReason, string>> = {
  [UnmatchedReason.Unmatched]: STATUS_KEYS[MatchStatus.Unmatched],
  [UnmatchedReason.KindNotLoaded]: STATUS_KEYS[MatchStatus.KindNotLoaded],
  [UnmatchedReason.NotOffered]: 'character.import.status.notOffered',
};

export const REASON_TONES: Readonly<Record<UnmatchedReason, BadgeTone>> = {
  [UnmatchedReason.Unmatched]: STATUS_TONES[MatchStatus.Unmatched],
  [UnmatchedReason.KindNotLoaded]: STATUS_TONES[MatchStatus.KindNotLoaded],
  [UnmatchedReason.NotOffered]: BadgeTone.Warning,
};

/** Attribute modifiers as the import shows them: +2, -1, 0. */
export const SIGNED: Intl.NumberFormatOptions = { signDisplay: 'exceptZero' };
