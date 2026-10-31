import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Character } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  playerCoreClasses,
  playerCoreClassId,
  spellFixtures,
} from '@pioneer/character/domain/testing';
import { ContentRegistry, SlotKey, SpellFacet } from '@pioneer/rules/sdk';
import type { QueryParams } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { preparedFieldsOf } from './sheet-spell-picks';
import type { PreparedField, SpellPickSources } from './sheet-spell-picks';

const THIRD_RANK = SlotKey.parse('prepared:wizard:3:0');
const CANTRIP = SlotKey.parse('prepared:wizard:cantrip:0');

function bardAt(level: number): Character {
  return new CharacterBuilder()
    .named('bard')
    .picking('class', playerCoreClassId('bard'))
    .picking('boost:1:class:0', 'cha')
    .atLevel(level)
    .build();
}

function wizardAt(level: number): Character {
  return new CharacterBuilder()
    .named('wizard')
    .picking('class', playerCoreClassId('wizard'))
    .picking('boost:1:class:0', 'str')
    .atLevel(level)
    .build();
}

interface Picked {
  readonly fields: readonly PreparedField[];
  readonly params: WritableSignal<QueryParams>;
  readonly writes: Record<string, string | undefined>[];
}

/** A 5th-level wizard whose pickers filter, with the URL's params and what was written to them. */
function picked(params: QueryParams = {}, filtering = true, character: Character = wizardAt(5)): Picked {
  const registry = new ContentRegistry();
  registry.register(playerCoreClasses());
  registry.register(spellFixtures());
  const url = signal<QueryParams>(params);
  const writes: Record<string, string | undefined>[] = [];
  const sources: SpellPickSources = {
    registry: signal(registry),
    character: signal<Character | undefined>(character),
    slots: signal([]),
    select: async () => undefined,
    clear: async () => undefined,
    translate: (key) => key,
    messages: signal(undefined),
    ...(filtering
      ? {
          filters: {
            params: url,
            write: async (changes: Readonly<Record<string, string | undefined>>) => {
              writes.push({ ...changes });
              url.update((now) => {
                const named = new Set(Object.keys(changes));
                const kept = Object.entries(now).filter(([name]) => !named.has(name));
                const set = Object.entries(changes).filter((change) => change[1] !== undefined);
                return Object.fromEntries([...kept, ...set]);
              });
              await Promise.resolve();
            },
          },
        }
      : {}),
  };
  const fields = TestBed.runInInjectionContext(() => preparedFieldsOf(sources));
  return {
    fields: fields().flatMap((entry) => entry.ranks.flatMap((rank) => rank.fields)),
    params: url,
    writes,
  };
}

const fieldAt = (read: Picked, key: string): PreparedField | undefined =>
  read.fields.find((field) => field.key === key);

/** How many spells the slot `key`'s picker lists. */
const rowCount = (read: Picked, key: string): number => fieldAt(read, key)?.rows().length ?? 0;

describe('spell picker filters', () => {
  it('opens on Available to you for the slot, keeping every spell the slot offers', () => {
    const read = picked();
    const field = fieldAt(read, THIRD_RANK);

    expect(field?.filter?.preset()).toBe(true);
    expect(field?.rows().length).toBeGreaterThan(0);
  });

  it('narrows the slot’s spells by the filters in the URL, for its own slot alone', () => {
    const open = rowCount(picked(), THIRD_RANK);
    const read = picked({ [`f.${THIRD_RANK}.rank`]: '..1' });
    const narrowed = fieldAt(read, THIRD_RANK);

    expect(narrowed?.filter?.preset()).toBe(false);
    expect(rowCount(read, THIRD_RANK)).toBeLessThan(open);
    expect(narrowed?.rows().every((row) => row.rank <= 1)).toBe(true);
    expect(fieldAt(read, CANTRIP)?.filter?.preset()).toBe(true);
  });

  it('shows every spell the slot offers once everything is asked for, and puts that in the URL', async () => {
    const read = picked({ [`f.${THIRD_RANK}.rank`]: '..1' });

    await fieldAt(read, THIRD_RANK)?.filter?.showEverything(true);

    expect(read.params()).toMatchObject({ [`f.${THIRD_RANK}`]: 'all' });
    expect(fieldAt(read, THIRD_RANK)?.filter?.everything()).toBe(true);
    expect(rowCount(read, THIRD_RANK)).toBe(rowCount(picked(), THIRD_RANK));
  });

  it('lists every spell the slot offers where the pickers do not filter', () => {
    const field = fieldAt(picked({}, false), THIRD_RANK);

    expect(field?.filter).toBeUndefined();
    expect(field?.rows().length).toBeGreaterThan(0);
  });

  it('starts a spontaneous caster’s slots on its own tradition, not the wizard’s', () => {
    const bard = picked({}, true, bardAt(5));
    const slot = bard.fields.find((field) => field.key.startsWith('repertoire:bard:1:'));
    const wizard = fieldAt(picked(), THIRD_RANK);

    expect(slot?.filter?.state().get(SpellFacet.Tradition)).toMatchObject({ include: ['occult'] });
    expect(wizard?.filter?.state().get(SpellFacet.Tradition)).toMatchObject({ include: ['arcane'] });
  });
});
