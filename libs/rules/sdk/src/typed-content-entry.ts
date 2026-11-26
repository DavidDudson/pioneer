import * as z from 'zod';

import { checkEntry, checkKnownKind, ENTRY_ARMS } from './content-entry';
import { ContentKind } from './content-kind';
import { CreatureData, EntryRules } from './typed-content';

/** One arm per registered kind, in the model's order, with `rules` parsed whole and a creature's abilities too. */
const Entry = z.discriminatedUnion('kind', [
  ENTRY_ARMS[ContentKind.Action].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Ancestry].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.AncestryFeature].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Archetype].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Background].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Class].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.ClassFeature].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Condition].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Creature].extend({ rules: EntryRules, data: CreatureData }),
  ENTRY_ARMS[ContentKind.DamageType].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Deity].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Effect].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Environment].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Feat].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Heritage].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Language].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Ritual].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Sense].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Spell].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.SpellcastingTradition].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Statistic].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Trait].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.VariantRule].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Armor].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Consumable].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Equipment].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Kit].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Rune].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Shield].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Treasure].extend({ rules: EntryRules }),
  ENTRY_ARMS[ContentKind.Weapon].extend({ rules: EntryRules }),
]);

export type ContentEntry = z.output<typeof Entry>;

/** One content entry of any kind (content-model.md) with every rule element parsed; the issues of `ContentEntryModel` plus rule element errors. */
export const ContentEntry: z.ZodType<ContentEntry> = z.unknown().check(checkKnownKind).pipe(Entry.check(checkEntry));
