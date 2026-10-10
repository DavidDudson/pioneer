import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import { ContentLicense, ContentPack, ContentRegistry, NamespaceKind, Predicate } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { coreRules } from './testing/core-rules';

/** A homebrew pack that adds a `sanity` namespace and nothing else. */
function sanityPack(kind: NamespaceKind): ContentPack {
  return ContentPack.define({
    manifest: { id: 'sanity', title: 'Sanity', publisher: 'Pioneer tests', license: ContentLicense.Homebrew },
    ancestries: [],
    creatures: [],
    rollOptionNamespaces: { sanity: kind },
  });
}

/** How a predicate needing `option` reads with no roll options, under the namespaces of `packs`. */
function missing(option: string, ...packs: readonly ContentPack[]): Truth {
  const registry = new ContentRegistry();
  for (const pack of packs) {
    registry.register(pack);
  }
  return evaluatePredicate(Predicate.parse([option]), new PredicateFacts([], registry.rollOptionNamespaces()));
}

describe('core rules roll option namespaces', () => {
  test('are the table tests below the packs use', () => {
    const registry = new ContentRegistry();
    registry.register(coreRules);
    expect(registry.rollOptionNamespaces()).toStrictEqual(CORE_NAMESPACES);
  });

  test('read a missing character fact as false and a missing situation as unknown', () => {
    expect(missing('feat:shield-block', coreRules)).toBe(Truth.False);
    expect(missing('self:action:strike', coreRules)).toBe(Truth.Unknown);
    expect(missing('terrain:forest', coreRules)).toBe(Truth.Unknown);
  });

  test('a homebrew namespace is classified by its pack, with no code change', () => {
    expect(missing('sanity:shaken', coreRules)).toBe(Truth.Unknown);
    expect(missing('sanity:shaken', coreRules, sanityPack(NamespaceKind.Known))).toBe(Truth.False);
    expect(missing('sanity:shaken', coreRules, sanityPack(NamespaceKind.Situational))).toBe(Truth.Unknown);
  });

  test('a homebrew pack contradicting a core namespace is rejected', () => {
    const contrary = ContentPack.define({
      manifest: { id: 'contrary', title: 'Contrary', publisher: 'Pioneer tests', license: ContentLicense.Homebrew },
      ancestries: [],
      creatures: [],
      rollOptionNamespaces: { feat: NamespaceKind.Situational },
    });
    const registry = new ContentRegistry();
    registry.register(coreRules);
    expect(() => {
      registry.register(contrary);
    }).toThrow();
  });
});
