import { describe, expect, test } from 'bun:test';

import { ContentRegistry, Level } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { AutomaticKind, automaticTimeline } from './automatic-changes';
import type { AutomaticChange, AutomaticRow } from './automatic-changes';
import { ChoiceSourceKind } from './choice-source';
import { slotContent } from './slot-offer';
import {
  CharacterBuilder,
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  playerCoreClasses,
  playerCoreClassId,
  skillFixtures,
  spellFixtures,
} from './testing';

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
registry.register(playerCoreClasses());
registry.register(spellFixtures());
const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const LEVEL_COUNT = 20;
const SECOND_RANK = 2;
const HEIGHTENING_LEVELS = [3, 5, 7, 9, 11, 13, 15, 17, 19].map((level) => Level.parse(level));

function fighterRows(): readonly AutomaticRow[] {
  const { document } = new CharacterBuilder().picking('class', FEAT_SLOT_FIGHTER).atLevel(1).build();
  return automaticTimeline(document, content);
}

function wizardRows(): readonly AutomaticRow[] {
  const { document } = new CharacterBuilder()
    .named('wizard')
    .picking('class', playerCoreClassId('wizard'))
    .picking('boost:1:class:0', 'int')
    .atLevel(1)
    .build();
  return automaticTimeline(document, content);
}

function ofKind(rows: readonly AutomaticRow[], kind: AutomaticKind): AutomaticChange[] {
  return rows.flatMap((row) => row.changes.filter((change) => change.kind === kind));
}

/** The ranks the slot gains are of. */
function slotRanks(changes: readonly AutomaticChange[]): unknown[] {
  return changes.flatMap((change) => (change.kind === AutomaticKind.SpellSlots ? [change.rank] : []));
}

describe('automatic timeline', () => {
  test('has one row for each level from 1 to 20', () => {
    expect(fighterRows()).toHaveLength(LEVEL_COUNT);
  });

  test('lists a martial’s proficiency rises, sourced to its class, never at 1st level', () => {
    const rows = fighterRows();
    const rises = ofKind(rows, AutomaticKind.ProficiencyRise);
    expect(rises.length).toBeGreaterThan(0);
    expect(rows[0]?.changes.some((change) => change.kind === AutomaticKind.ProficiencyRise)).toBe(false);
    for (const rise of rises) {
      expect(rise.source.kind).toBe(ChoiceSourceKind.Class);
    }
  });

  test('gives a martial no spell slots or cantrip heightening', () => {
    const rows = fighterRows();
    expect(ofKind(rows, AutomaticKind.SpellSlots)).toHaveLength(0);
    expect(ofKind(rows, AutomaticKind.CantripHeightening)).toHaveLength(0);
  });

  test('lists a caster’s slot gains, sourced to its spellcasting, and heightens cantrips at 3rd, 5th and so on', () => {
    const rows = wizardRows();
    const gains = ofKind(rows, AutomaticKind.SpellSlots);
    expect(gains.length).toBeGreaterThan(0);
    for (const gain of gains) {
      expect(gain.source.kind).toBe(ChoiceSourceKind.Spellcasting);
    }
    const heightened = rows.filter((row) =>
      row.changes.some((change) => change.kind === AutomaticKind.CantripHeightening),
    );
    expect(heightened.map((row) => row.level)).toStrictEqual(HEIGHTENING_LEVELS);
    expect(rows[0]?.changes.some((change) => change.kind === AutomaticKind.SpellSlots)).toBe(false);
  });

  test('gives a caster a new rank of slots when the class table first reaches it', () => {
    const gains = ofKind(wizardRows(), AutomaticKind.SpellSlots);
    expect(slotRanks(gains)).toContain(SECOND_RANK);
  });
});
