import { ChoiceSourceKind } from '@pioneer/character/domain';
import type { ChoiceSource } from '@pioneer/character/domain';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** The words for each kind of source, on its own and with the entry's name. */
const SOURCE_KEYS: Readonly<Record<ChoiceSourceKind, { readonly plain: string; readonly named: string }>> = {
  [ChoiceSourceKind.Class]: { plain: 'rules.choices.source.class', named: 'rules.choices.source.classNamed' },
  [ChoiceSourceKind.Ancestry]: { plain: 'rules.choices.source.ancestry', named: 'rules.choices.source.ancestryNamed' },
  [ChoiceSourceKind.Background]: {
    plain: 'rules.choices.source.background',
    named: 'rules.choices.source.backgroundNamed',
  },
  [ChoiceSourceKind.Spellcasting]: {
    plain: 'rules.choices.source.spellcasting',
    named: 'rules.choices.source.spellcastingNamed',
  },
  [ChoiceSourceKind.Archetype]: {
    plain: 'rules.choices.source.archetype',
    named: 'rules.choices.source.archetypeNamed',
  },
  [ChoiceSourceKind.General]: { plain: 'rules.choices.source.general', named: 'rules.choices.source.general' },
};

/** A source as text: "Class (Fighter)", "Spellcasting (Wizard)", "General progression". */
export function sourceMessageOf({ kind, name }: ChoiceSource): MessageDescriptor {
  const keys = SOURCE_KEYS[kind];
  return name === undefined ? message(keys.plain) : message(keys.named, { name });
}
