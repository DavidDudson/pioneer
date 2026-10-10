import { describe, expect, test } from 'bun:test';

import { Attribute } from '@pioneer/rules/sdk';
import { fakeSeeded } from '@pioneer/shared/kernel/testing';
import { assert, integer, nat, property } from 'fast-check';

import { entryLookup } from './content-lookup';
import { buildImportReport } from './import-report';
import { PathbuilderBuild } from './pathbuilder-export';
import { PathbuilderProblem, readPathbuilderExport } from './read-pathbuilder-export';

const SCORE_MIN = 0;
const SCORE_MAX = 25;

const anyExport = nat().map((seed) => ({ success: true, build: fakeSeeded(PathbuilderBuild, seed) }));
const nothingLoaded = entryLookup({});

describe('readPathbuilderExport (properties)', () => {
  test('any schema-valid export reads, or fails only on a name or ancestry Pioneer cannot hold', () => {
    assert(
      property(anyExport, (input) => {
        const result = readPathbuilderExport(input);
        if (!result.ok) {
          expect(result.problem).toBe(PathbuilderProblem.Malformed);
          const fields = result.issues.map((issue) => issue.path.slice(0, 2).join('.'));
          expect(fields.every((field) => field === 'build.name' || field === 'build.ancestry')).toBe(true);
        }
      }),
    );
  });

  test('the report accounts for every name exactly once', () => {
    assert(
      property(anyExport, (input) => {
        const result = readPathbuilderExport(input);
        if (!result.ok) {
          return;
        }
        const rows = buildImportReport(result.value.names, nothingLoaded).groups.flatMap((group) => group.rows);
        const total = rows.reduce((sum, row) => sum + row.occurrences, 0);
        expect(total).toBe(result.value.names.length);
        const keys = rows.map((row) => `${row.kind}:${row.name}`);
        expect(new Set(keys).size).toBe(keys.length);
      }),
    );
  });

  test('a score becomes floor((score - 10) / 2)', () => {
    assert(
      property(integer({ min: SCORE_MIN, max: SCORE_MAX }), (score) => {
        const build = {
          name: 'Seoni',
          class: 'Sorcerer',
          level: 1,
          ancestry: 'Human',
          heritage: '',
          background: '',
          abilities: { str: score, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          feats: [],
        };
        const result = readPathbuilderExport({ success: true, build });
        expect<number | false>(result.ok && result.value.attributes.get(Attribute.Strength)).toBe(
          Math.floor((score - 10) / 2),
        );
      }),
    );
  });
});
