import { describe, expect, test } from 'bun:test';

import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { ContentId, contentId, PackId, Slug } from './content-id';
import { ContentPack, ContentPackSchema } from './content-pack';
import { ContentRegistry } from './content-registry';
import { RulesMessage } from './messages';
import { ProficiencyBonusTable } from './proficiency';
import { RuleElement } from './rule-element';
import { ContentPackBuilder } from './testing';
import { VariantRuleId } from './variant-rule';

const PLAYER_CORE = {
  untrained: '0',
  trained: '2 + @level',
  expert: '4 + @level',
  master: '6 + @level',
  legendary: '8 + @level',
};

function issuesFrom(schema: z.ZodType, json: unknown): readonly FieldIssue[] {
  const result = schema.safeParse(json);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const variant = {
  slug: 'without-level',
  name: 'Without Level',
  sources: [{ kind: 'book', book: 'gm-core', page: 85 }],
  rules: [{ key: 'ProficiencyBonus', table: { ...PLAYER_CORE, trained: '2' } }],
};

describe('ProficiencyBonusTable', () => {
  test('accepts a formula per rank that reads @level', () => {
    expect(issuesFrom(ProficiencyBonusTable, PLAYER_CORE)).toStrictEqual([]);
  });

  test('every rank needs a formula', () => {
    const { legendary: _legendary, ...missing } = PLAYER_CORE;
    expect(issuesFrom(ProficiencyBonusTable, missing).map(({ path }) => path)).toStrictEqual([['legendary']]);
  });

  test('a reference other than @level is a problem at that rank, with its position', () => {
    expect(issuesFrom(ProficiencyBonusTable, { ...PLAYER_CORE, expert: '4 + @attr.str' })).toStrictEqual([
      {
        path: ['expert'],
        message: message(RulesMessage.ProficiencyBonusReference, { found: '@attr.str', position: 5 }),
      },
    ]);
  });

  test('@prof would read itself, so it is a problem too', () => {
    expect(issuesFrom(ProficiencyBonusTable, { ...PLAYER_CORE, master: '@prof.ac' })).toStrictEqual([
      {
        path: ['master'],
        message: message(RulesMessage.ProficiencyBonusReference, { found: '@prof.ac', position: 1 }),
      },
    ]);
  });

  test('an item reference is out of scope, as in any actor formula', () => {
    expect(issuesFrom(ProficiencyBonusTable, { ...PLAYER_CORE, trained: '@item.level' })).toContainEqual({
      path: ['trained'],
      message: message(RulesMessage.ReferenceOutOfScope, { found: '@item.level', position: 1 }),
    });
  });
});

describe('ProficiencyBonus element', () => {
  test('carries a whole table', () => {
    expect(issuesFrom(RuleElement, { key: 'ProficiencyBonus', table: PLAYER_CORE })).toStrictEqual([]);
    expect(issuesFrom(RuleElement, { key: 'ProficiencyBonus', table: {} })).not.toStrictEqual([]);
  });
});

/** A pack as JSON with `overrides` added. */
function pack(overrides: object, id = 'variant-test'): object {
  return {
    manifest: { id, title: 'Variant test', publisher: 'Pioneer', license: 'homebrew' },
    ancestries: [],
    creatures: [],
    ...overrides,
  };
}

describe('variant rules in packs', () => {
  test('a pack may define the table and variant rules; both are optional', () => {
    expect(
      issuesFrom(ContentPackSchema, pack({ proficiencyBonus: PLAYER_CORE, variantRules: [variant] })),
    ).toStrictEqual([]);
    expect(issuesFrom(ContentPackSchema, pack({}))).toStrictEqual([]);
  });

  test('a variant rule needs a source', () => {
    const paths = issuesFrom(ContentPackSchema, pack({ variantRules: [{ ...variant, sources: [] }] })).map(
      ({ path }) => path,
    );
    expect(paths).toStrictEqual([['variantRules', 0, 'sources']]);
  });

  test('variant rule slugs are unique within a pack', () => {
    expect(issuesFrom(ContentPackSchema, pack({ variantRules: [variant, variant] }))).not.toStrictEqual([]);
  });

  test('the registry indexes variant rules by id, and the last registered table wins', () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withId('first').build());
    expect(registry.proficiencyBonus()).toBeUndefined();
    const withVariant = ContentPack.define(
      ContentPackSchema.parse(pack({ proficiencyBonus: PLAYER_CORE, variantRules: [variant] })),
    );
    registry.register(withVariant);
    expect(registry.proficiencyBonus()).toStrictEqual(withVariant.proficiencyBonus);
    // A pack without a table leaves the one in force; a later one with a table restates it.
    registry.register(new ContentPackBuilder().withId('no-table').build());
    expect(registry.proficiencyBonus()).toStrictEqual(withVariant.proficiencyBonus);
    const homebrew = ContentPack.define(
      ContentPackSchema.parse(pack({ proficiencyBonus: { ...PLAYER_CORE, untrained: '1' } }, 'homebrew')),
    );
    registry.register(homebrew);
    expect(registry.proficiencyBonus()).toStrictEqual(homebrew.proficiencyBonus);
    const id = VariantRuleId.parse(contentId(PackId.parse('variant-test'), Slug.parse('without-level')));
    expect(registry.variantRule(id)?.definition.name).toBe(withVariant.variantRules[0]?.name);
    expect(registry.variantRules().map((entry) => ContentId.parse(entry.id))).toStrictEqual([ContentId.parse(id)]);
  });
});
