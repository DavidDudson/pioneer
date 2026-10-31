import { faker } from '@faker-js/faker';
import { registerFake } from '@pioneer/shared/kernel/testing';

import { LanguageList } from '../ancestry';
import { Attribute, AttributeBoost, Attributes } from '../attribute';
import { EntrySlug, LORE_CHOICE_PREFIX, LoreChoice, Slug } from '../content-id';
import { ContentKind } from '../content-kind';
import { SlotKey } from '../selector';

const SLUG_WORDS = 2;
/** A slot key's trailing number, as in `skill-increase:3`: a level. */
const SLOT_NUMBER = { min: 1, max: 20 } as const;
const ATTRIBUTES = Object.values(Attribute);
/** How many languages a faked list names. */
const LANGUAGES = { min: 0, max: 3 } as const;

/** Lowercase words joined by `-`, as a slug is written. */
function slugWords(): string {
  return faker.word
    .words(SLUG_WORDS)
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/gu, '-')
    .replaceAll(/^-|-$/gu, '');
}

/**
 * Register fakers for rules-SDK schemas the generator can't derive. Slugs, custom Lore picks and key paths use a lookahead regex,
 * which the regex-based generator ignores, and attribute and language lists name each item once, a check it can't see.
 * Brands share the instance they were branded from, so `Slug` also covers PackId, and `SlotKey` every key path
 * (selectors, domains, toggle keys). Idempotent; call explicitly (no side-effect imports).
 */
export function installRulesFakes(): void {
  registerFake(Slug, slugWords);
  registerFake(LoreChoice, () => `${LORE_CHOICE_PREFIX}${slugWords()}`);
  registerFake(SlotKey, () => `${slugWords()}:${faker.number.int(SLOT_NUMBER)}`);
  registerFake(EntrySlug, () => `${faker.helpers.arrayElement(Object.values(ContentKind))}:${slugWords()}`);
  registerFake(AttributeBoost, () => faker.helpers.arrayElements(ATTRIBUTES, { min: 1, max: ATTRIBUTES.length }));
  registerFake(Attributes, () => faker.helpers.arrayElements(ATTRIBUTES, { min: 0, max: ATTRIBUTES.length }));
  registerFake(LanguageList, () => Array.from({ length: faker.number.int(LANGUAGES) }, () => faker.string.uuid()));
}
