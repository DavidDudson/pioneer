import { CLASS_SLOT, classPickerContent, rootSlotOptions, skillContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { ContentId, RichText } from '@pioneer/rules/sdk';
import type { Attribute, AttributeModifiers, ContentRegistry, Selector } from '@pioneer/rules/sdk';
import { ATTRIBUTE_MESSAGES, ClassPickerMessage, PROFICIENCY_NAMES, TRADITION_MESSAGES } from '@pioneer/rules/ui';
import type { ClassPickerRow, KeyAttributePickerRow, SubclassPickerRow } from '@pioneer/rules/ui';

import type { SheetKeyAttribute, SheetSubclass } from '../sheet/sheet-build';
import { sheetTrainedAgain, trainedAgainNote } from '../sheet/sheet-skill-repeats';
import { sheetSlotContent } from '../sheet/sheet-slot-content';

/** What the class rows read besides the content: words. */
export interface ClassRowReads {
  readonly translate: (key: string, params?: object) => string;
}

/** What the subclass rows read: the subclass slot, and words. */
export interface SubclassRowReads extends ClassRowReads {
  readonly subclass: SheetSubclass;
}

/** The score a modifier stands for: 10 at +0, and 2 more for each point. */
const SCORE_BASE = 10;
const SCORE_PER_MODIFIER = 2;

/** Statistics already named, by registry: a registry's packs never change once loaded. */
const STATISTIC_NAMES = new WeakMap<ContentRegistry, ReadonlyMap<Selector, string>>();

/** Each statistic's name by selector; the last pack's wins, as in the registry. */
function statisticNames(registry: ContentRegistry): ReadonlyMap<Selector, string> {
  const read =
    STATISTIC_NAMES.get(registry) ??
    new Map(
      registry.packs.flatMap((pack) => pack.statistics.map((each): [Selector, string] => [each.selector, each.name])),
    );
  STATISTIC_NAMES.set(registry, read);
  return read;
}

/**
 * The rows of the class picker: every class the slot offers (all of them without a character) with the facts to choose
 * by, and a note when picking it would train a skill again.
 */
export function classRows(
  registry: ContentRegistry,
  character: Character | undefined,
  { translate }: ClassRowReads,
): readonly ClassPickerRow[] {
  const offered =
    character === undefined
      ? undefined
      : new Set(
          rootSlotOptions(character.document, sheetSlotContent(registry), CLASS_SLOT).map((option) => option.value),
        );
  const skills = new Map(skillContent(registry).skills.map((skill) => [skill.selector, skill.name]));
  const statistics = statisticNames(registry);
  const options = classPickerContent(registry).classes.filter((each) => offered?.has(each.id) ?? true);
  const trainedAgain =
    character === undefined
      ? undefined
      : sheetTrainedAgain(registry, character, CLASS_SLOT)(options.map((each) => each.id));
  return options.map(
    ({ id, name, keyAttribute, hitPoints, trained, additionalSkills, traditions, proficiencies, sources }) => {
      const again = trainedAgain?.get(id);
      return {
        id,
        name,
        keyAttribute,
        hitPoints,
        skills: trained.map((selector) => skills.get(selector) ?? selector),
        additionalSkills,
        traditions: traditions.map((tradition) => translate(TRADITION_MESSAGES[tradition])),
        proficiencies: proficiencies.map(({ selector, rank }) =>
          translate(ClassPickerMessage.Proficiency, {
            statistic: statistics.get(selector) ?? selector,
            rank: translate(PROFICIENCY_NAMES[rank]),
          }),
        ),
        sources,
        note: again === undefined ? undefined : trainedAgainNote(again, translate),
        disabledReason: undefined,
      };
    },
  );
}

/**
 * The rows of the subclass picker: every subclass the class's slot offers, each with what it grants, and a note when
 * picking it would train a skill again.
 */
export function subclassRows(
  registry: ContentRegistry,
  character: Character,
  { subclass, translate }: SubclassRowReads,
): readonly SubclassPickerRow[] {
  const { features } = classPickerContent(registry);
  const trainedAgain = sheetTrainedAgain(registry, character, subclass.key)(subclass.options.map((each) => each.value));
  return subclass.options.map(({ value, label }): SubclassPickerRow => {
    const feature = features.get(ContentId.parse(value));
    const again = trainedAgain.get(value);
    return {
      id: value,
      name: label,
      summary: feature?.description ?? RichText.parse([]),
      sources: feature?.sources ?? [],
      note: again === undefined ? undefined : trainedAgainNote(again, translate),
      disabledReason: undefined,
    };
  });
}

/** The rows of the key attribute picker: each attribute the class allows with the character's modifier and score. */
export function keyAttributeRows(
  keyAttribute: SheetKeyAttribute,
  modifiers: AttributeModifiers,
  { translate }: ClassRowReads,
): readonly KeyAttributePickerRow[] {
  return keyAttribute.options.map((attribute: Attribute): KeyAttributePickerRow => {
    const modifier = modifiers.get(attribute);
    return {
      id: attribute,
      name: translate(ATTRIBUTE_MESSAGES[attribute]),
      modifier,
      score: SCORE_BASE + SCORE_PER_MODIFIER * modifier,
      disabledReason: undefined,
    };
  });
}
