import { describe, expect, test } from 'bun:test';

import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { PackId } from './content-id';
import { ContentPackSchema } from './content-pack';
import { ContentRegistry } from './content-registry';
import { ContentLicense } from './license';
import { RulesMessage } from './messages';
import { NamespaceKind, RollOptionNamespace } from './roll-option-namespace';
import { ContentPackBuilder } from './testing';

const SANITY = RollOptionNamespace.parse('sanity');
const SELF = RollOptionNamespace.parse('self');

/** The issues `register` throws for `pack`, or none if it registers. */
function registerIssues(registry: ContentRegistry, pack: ContentPackBuilder): readonly FieldIssue[] {
  try {
    registry.register(pack.build());
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fieldIssues(error.issues);
    }
    throw error;
  }
}

describe('roll option namespaces', () => {
  test('a pack adds a namespace, which the registry classifies', () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withNamespace('self', NamespaceKind.Known).build());
    registry.register(new ContentPackBuilder().withId('homebrew').withNamespace('sanity', NamespaceKind.Known).build());
    expect(registry.rollOptionNamespaces()).toStrictEqual(
      new Map([
        [SELF, NamespaceKind.Known],
        [SANITY, NamespaceKind.Known],
      ]),
    );
  });

  test('two packs giving a namespace the same kind merge', () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withNamespace('sanity', NamespaceKind.Situational).build());
    const issues = registerIssues(
      registry,
      new ContentPackBuilder().withId('homebrew').withNamespace('sanity', NamespaceKind.Situational),
    );
    expect(issues).toStrictEqual([]);
    expect(registry.rollOptionNamespaces()).toStrictEqual(new Map([[SANITY, NamespaceKind.Situational]]));
  });

  test('a pack giving a namespace the other kind is rejected at that entry, leaving the registry as it was', () => {
    const registry = new ContentRegistry();
    registry.register(new ContentPackBuilder().withNamespace('sanity', NamespaceKind.Known).build());
    const issues = registerIssues(
      registry,
      new ContentPackBuilder()
        .withId('homebrew')
        .withNamespace('terrain', NamespaceKind.Situational)
        .withNamespace('sanity', NamespaceKind.Situational),
    );
    const conflict = message(RulesMessage.NamespaceConflict, {
      namespace: 'sanity',
      kind: NamespaceKind.Known,
      pack: 'test-pack',
    });
    expect(issues).toStrictEqual([{ path: ['rollOptionNamespaces', 'sanity'], message: conflict }]);
    expect(registry.packs.map((pack) => pack.id)).toStrictEqual([PackId.parse('test-pack')]);
    expect(registry.rollOptionNamespaces()).toStrictEqual(new Map([[SANITY, NamespaceKind.Known]]));
  });

  test('a pack lists namespaces only as known or situational', () => {
    const result = ContentPackSchema.safeParse({
      manifest: { id: 'homebrew', title: 'Homebrew', publisher: 'Pioneer tests', license: ContentLicense.Homebrew },
      ancestries: [],
      creatures: [],
      rollOptionNamespaces: { sanity: 'maybe', 'Not A Namespace': NamespaceKind.Known },
    });
    expect(result.error?.issues.map(({ path }) => path)).toStrictEqual([
      ['rollOptionNamespaces', 'sanity'],
      ['rollOptionNamespaces', 'Not A Namespace'],
    ]);
  });
});
