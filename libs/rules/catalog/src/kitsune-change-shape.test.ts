import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import { ContentEntryFile, ContentId, ContentKind, RollOption, RuleElementKey } from '@pioneer/rules/sdk';

import { coreNamespaces } from './testing/fighter';

/** Mwangi Expanse's Change Shape action, which the kitsune ancestry feature grants. */
const CHANGE_SHAPE = ContentId.parse('e114f41a-9129-5b91-b7d2-f88e152b9c0c');

/** The Ancestry Guide's hand-written kitsune form. */
const KITSUNE_FORM = ContentId.parse('957551d2-bd91-56eb-a759-5ed56187dd90');

/** The forms Change Shape offers a character with `options`, as the entry ids of their effects. */
async function formsFor(options: readonly string[]): Promise<readonly ContentId[]> {
  const file = await import('@pioneer/content/packs/mwangi-expanse/action.json');
  const action = ContentEntryFile.parse(file.default).find(
    (entry) => entry.kind === ContentKind.Action && entry.slug === 'action:change-shape',
  );
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    coreNamespaces(),
  );
  const effects = (action?.kind === ContentKind.Action ? action.data.effects : undefined) ?? [];
  return effects
    .filter((listed): listed is Exclude<typeof listed, ContentId> => typeof listed !== 'string')
    .filter(({ predicate }) => evaluatePredicate(predicate, facts) === Truth.True)
    .map(({ effect }) => effect);
}

/** The items the kitsune Change Shape ancestry feature grants. */
async function grantedByFeature(): Promise<readonly unknown[]> {
  const file = await import('@pioneer/content/packs/ancestry-guide/ancestry-feature.json');
  const feature = ContentEntryFile.parse(file.default).find(
    (entry) => entry.kind === ContentKind.AncestryFeature && entry.slug === 'ancestry-feature:change-shape',
  );
  return (feature?.rules ?? []).filter((rule) => rule.key === RuleElementKey.GrantItem).map((rule) => rule.item);
}

describe('Ancestry Guide: kitsune Change Shape', () => {
  test('the kitsune ancestry feature grants the Change Shape action', async () => {
    expect(await grantedByFeature()).toStrictEqual([CHANGE_SHAPE]);
  });

  test('a kitsune can take the kitsune form', async () => {
    expect(await formsFor(['ancestry:kitsune'])).toStrictEqual([KITSUNE_FORM]);
  });

  test('a character who is not a kitsune is offered no kitsune form', async () => {
    expect(await formsFor(['ancestry:human'])).toStrictEqual([]);
  });
});
