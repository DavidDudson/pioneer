import { describe, expect, test } from 'bun:test';

import { isNameShardCommand, nameShards, PROJECT, shardProblems } from './test-sharding.ts';

describe('isNameShardCommand', () => {
  test('flags a test name pattern', () => {
    expect(isNameShardCommand("bun test apps/api/src/a.test.ts --test-name-pattern 'Bard|Cleric'")).toBe(true);
  });

  test('flags the short flag', () => {
    expect(isNameShardCommand("bun test a.test.ts -t 'Bard'")).toBe(true);
  });

  test('flags the equals form and a pattern after other flags', () => {
    expect(isNameShardCommand("bun test a.test.ts --test-name-pattern='Bard'")).toBe(true);
    expect(isNameShardCommand('bun test a.test.ts -t=Bard')).toBe(true);
    expect(isNameShardCommand("bun test --timeout 5000 a.test.ts --test-name-pattern 'Bard'")).toBe(true);
  });

  test('ignores a plain bun test', () => {
    expect(isNameShardCommand('bun test apps/api --path-ignore-patterns=**/a.test.ts')).toBe(false);
  });

  test('ignores other commands', () => {
    expect(isNameShardCommand("vitest run -t 'Bard'")).toBe(false);
  });
});

describe('nameShards', () => {
  test('names a configuration and a top-level command', () => {
    const project = {
      targets: {
        test: { configurations: { one: { command: "bun test a.test.ts --test-name-pattern 'A'" } } },
        slow: { command: "bun test b.test.ts --test-name-pattern 'B'" },
        fast: { options: { command: 'bun test c.test.ts' } },
        nx: { options: { command: "bun test d.test.ts --test-name-pattern 'D'" } },
      },
    };

    expect(nameShards('x/project.json', PROJECT.parse(project))).toEqual([
      'x/project.json#test:one',
      'x/project.json#slow',
      'x/project.json#nx',
    ]);
  });
});

describe('shardProblems', () => {
  const allowed: ReadonlySet<string> = new Set(['x#a']);

  test('passes an allowlisted shard', () => {
    expect(shardProblems(['x#a'], allowed)).toEqual([]);
  });

  test('reports a new shard', () => {
    expect(shardProblems(['x#a', 'x#b'], allowed)).toHaveLength(1);
  });

  test('reports a stale allowlist entry', () => {
    expect(shardProblems([], allowed)).toHaveLength(1);
  });
});
