import { faker } from '@faker-js/faker';
import { registerFake } from '@pioneer/shared/kernel/testing';

import { SlugSchema } from '../content-id';

const SLUG_WORDS = 2;

/**
 * Register fakers for rules-SDK schemas the generator can't derive. Slugs use
 * a lookahead regex, which the regex-based generator ignores. Brands share
 * the instance they were branded from, so this also covers PackId.
 * Idempotent; call explicitly (no side-effect imports).
 */
export function installRulesFakes(): void {
  registerFake(SlugSchema, () =>
    faker.word
      .words(SLUG_WORDS)
      .toLowerCase()
      .replaceAll(/[^a-z\d]+/gu, '-')
      .replaceAll(/^-|-$/gu, ''),
  );
}
