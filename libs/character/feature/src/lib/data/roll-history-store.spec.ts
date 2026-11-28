import { CharacterId } from '@pioneer/character/domain';
import { DiceExpressionText, DieFace, NO_FORTUNE, parseDiceExpression, rollWithFortune } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import { IndexedDbRollHistoryStore } from './indexed-db-roll-history-store';
import { MemoryRollHistoryStore } from './memory-roll-history-store';
import { ROLL_HISTORY_CAP } from './roll-history-entry';
import type { RollHistoryEntry, RollHistoryStore } from './roll-history-entry';

const MERISIEL = CharacterId.parse('0190c1c0-0000-7000-8000-000000000001');
const KYRA = CharacterId.parse('0190c1c0-0000-7000-8000-000000000002');
const CAP = 3;

function entryFor(character: CharacterId, name: string, face = 10): RollHistoryEntry {
  const outcome = parseDiceExpression(DiceExpressionText.parse('1d20+7'));

  if (!outcome.ok) {
    throw new Error('1d20+7 must parse');
  }

  const roll = rollWithFortune(outcome.expression, NO_FORTUNE, scriptedRandom([DieFace.parse(face)]));

  return { character, at: 1, name, expression: outcome.expression, roll, reasons: ['Raging'] };
}

async function names(store: RollHistoryStore, character: CharacterId): Promise<ReadonlyArray<string>> {
  const kept = await store.list(character);

  return kept.map(({ entry }) => entry.name);
}

describe.each([
  ['IndexedDbRollHistoryStore', (): RollHistoryStore => new IndexedDbRollHistoryStore(new IDBFactory())],
  ['MemoryRollHistoryStore', (): RollHistoryStore => new MemoryRollHistoryStore()],
])('%s', (_name, make) => {
  it('lists a character rolls newest first, as they were rolled', async () => {
    const store = make();
    const first = entryFor(MERISIEL, 'Athletics');
    await store.append(first, CAP);
    await store.append(entryFor(MERISIEL, 'Stealth'), CAP);

    await expect(names(store, MERISIEL)).resolves.toStrictEqual(['Stealth', 'Athletics']);
    const kept = await store.list(MERISIEL);

    expect(kept.at(1)?.entry).toStrictEqual(first);
  });

  it('keeps each character rolls apart', async () => {
    const store = make();
    await store.append(entryFor(MERISIEL, 'Athletics'), CAP);
    await store.append(entryFor(KYRA, 'Stealth'), CAP);

    await expect(names(store, KYRA)).resolves.toStrictEqual(['Stealth']);
  });

  it('drops the oldest rolls beyond the cap', async () => {
    const store = make();

    await store.append(entryFor(MERISIEL, 'A'), CAP);
    await store.append(entryFor(MERISIEL, 'B'), CAP);
    await store.append(entryFor(MERISIEL, 'C'), CAP);
    await store.append(entryFor(MERISIEL, 'D'), CAP);
    await store.append(entryFor(KYRA, 'Other'), CAP);

    await expect(names(store, MERISIEL)).resolves.toStrictEqual(['D', 'C', 'B']);
    await expect(names(store, KYRA)).resolves.toStrictEqual(['Other']);
  });

  it('rewrites a roll under its key', async () => {
    const store = make();
    const key = await store.append(entryFor(MERISIEL, 'Athletics'), CAP);

    await store.replace(key, entryFor(MERISIEL, 'Acrobatics'));

    await expect(names(store, MERISIEL)).resolves.toStrictEqual(['Acrobatics']);
  });

  it('does not bring back a roll that was dropped when it is rewritten', async () => {
    const store = make();
    const key = await store.append(entryFor(MERISIEL, 'Athletics'), CAP);
    await store.clear(MERISIEL);

    await store.replace(key, entryFor(MERISIEL, 'Acrobatics'));

    await expect(names(store, MERISIEL)).resolves.toStrictEqual([]);
  });

  it('clears one character and leaves the others', async () => {
    const store = make();
    await store.append(entryFor(MERISIEL, 'Athletics'), CAP);
    await store.append(entryFor(KYRA, 'Stealth'), CAP);

    await store.clear(MERISIEL);

    await expect(names(store, MERISIEL)).resolves.toStrictEqual([]);
    await expect(names(store, KYRA)).resolves.toStrictEqual(['Stealth']);
  });
});

describe('IndexedDbRollHistoryStore across visits', () => {
  it('keeps rolls across opens of one database, as across visits', async () => {
    const factory = new IDBFactory();
    await new IndexedDbRollHistoryStore(factory).append(entryFor(MERISIEL, 'Athletics'), CAP);

    await expect(names(new IndexedDbRollHistoryStore(factory), MERISIEL)).resolves.toStrictEqual(['Athletics']);
  });

  it('leaves out a record that no longer reads', async () => {
    const factory = new IDBFactory();
    const store = new IndexedDbRollHistoryStore(factory);
    await store.append(entryFor(MERISIEL, 'Athletics'), CAP);
    // A time before the epoch is one no roll is made at, so the codec refuses it.
    await store.append({ ...entryFor(MERISIEL, 'Older'), at: -1 }, CAP);

    await expect(names(store, MERISIEL)).resolves.toStrictEqual(['Athletics']);
  });
});

describe('the roll history cap', () => {
  it('is 100', () => {
    expect(ROLL_HISTORY_CAP).toBe(100);
  });
});
