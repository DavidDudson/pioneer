import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import { ContentEntryFile, ContentKind, RollOption, spellEffectId } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, SpellEffectEntry } from '@pioneer/rules/sdk';

/** The spells and effects of the player-core pack, read from their JSON files. */
async function packEntries(): Promise<readonly ContentEntry[]> {
  const files = await Promise.all([
    import('@pioneer/content/packs/player-core/spell.json'),
    import('@pioneer/content/packs/player-core/effect.json'),
  ]);
  return files.flatMap((file) => ContentEntryFile.parse(file.default));
}

/** Whether `entry` is offered to a character with the roll options `facts`. */
function isOffered(entry: SpellEffectEntry, facts: PredicateFacts): boolean {
  return typeof entry === 'string' || evaluatePredicate(entry.predicate, facts) === Truth.True;
}

/** The effect ids the spell `slug` offers a character with exactly the roll options `options`. */
async function offered(slug: string, options: readonly string[]): Promise<ReadonlySet<ContentId>> {
  const entries = await packEntries();
  const spell = entries.find((entry) => entry.kind === ContentKind.Spell && entry.slug === slug);
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    new Map(),
  );
  const listed = spell?.kind === ContentKind.Spell ? (spell.data.effects ?? []) : [];
  return new Set(listed.filter((entry) => isOffered(entry, facts)).map((entry) => spellEffectId(entry)));
}

/** The ids of the effects whose slug starts with `prefix`. */
async function effectsNamed(prefix: string): Promise<readonly ContentId[]> {
  const entries = await packEntries();
  return entries
    .filter((entry) => entry.kind === ContentKind.Effect && entry.slug.startsWith(prefix))
    .map((entry) => entry.id);
}

const FORM_SPELLS = ['spell:untamed-form', 'spell:untamed-shift'];
const INSECT_FORM_COUNT = 6;

describe.each(FORM_SPELLS)('%s', (spell) => {
  test('Insect Shape adds the six Insect Form effects, and a character without it gets none', async () => {
    const insects = await effectsNamed('effect:spell-effect-insect-form');
    expect(insects).toHaveLength(INSECT_FORM_COUNT);

    const withFeat = await offered(spell, ['feat:insect-shape']);
    const without = await offered(spell, []);

    expect(insects.every((id) => withFeat.has(id))).toBe(true);
    expect(insects.some((id) => without.has(id))).toBe(false);
  });

  test('Dragon Shape adds Dragon Form, and a character without it gets none', async () => {
    const dragons = await effectsNamed('effect:spell-effect-dragon-form');
    expect(dragons).toHaveLength(1);

    const withFeat = await offered(spell, ['feat:dragon-shape']);
    const without = await offered(spell, []);

    expect(dragons.every((id) => withFeat.has(id))).toBe(true);
    expect(dragons.some((id) => without.has(id))).toBe(false);
  });

  test('one shape feat does not offer the other feat’s forms', async () => {
    const insects = await effectsNamed('effect:spell-effect-insect-form');
    const dragons = await effectsNamed('effect:spell-effect-dragon-form');

    const dragonOnly = await offered(spell, ['feat:dragon-shape']);
    const insectOnly = await offered(spell, ['feat:insect-shape']);

    expect(insects.some((id) => dragonOnly.has(id))).toBe(false);
    expect(dragons.some((id) => insectOnly.has(id))).toBe(false);
  });
});
