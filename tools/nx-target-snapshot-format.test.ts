import { describe, expect, test } from 'bun:test';

import { parseGraphNodes, snapshotProject } from './nx-target-snapshot-format.ts';

/** The snapshot of a project whose graph node holds this `data` JSON, read through the graph-file parser. */
function snapshotOf(dataJson: string): string {
  const nodes = parseGraphNodes(`{"graph":{"nodes":{"web":{"data":${dataJson}}}}}`);
  const project = nodes['web'];

  if (project === undefined) {
    throw new Error('the web node is missing');
  }

  return snapshotProject(project);
}

describe('snapshotProject', () => {
  test('keeps what decides behaviour and drops metadata', () => {
    const text = snapshotOf(
      '{"tags":["beta","alpha"],"targets":{"test":{"executor":"nx:run-commands","cache":true,"metadata":{"technologies":["bun"]}}}}',
    );

    const expected = { tags: ['alpha', 'beta'], targets: { test: { cache: true, executor: 'nx:run-commands' } } };

    expect(text).toBe(`${JSON.stringify(expected, undefined, 2)}\n`);
  });

  test('prints the same text for targets declared in a different key order', () => {
    const first = snapshotOf('{"targets":{"build":{"cache":true,"options":{"zed":1,"alpha":[2,1]}}}}');
    const second = snapshotOf('{"targets":{"build":{"options":{"alpha":[2,1],"zed":1},"cache":true}}}');

    expect(first).toBe(second);
  });

  test('keeps the order of an array, which is meaningful in inputs and dependsOn', () => {
    const text = snapshotOf('{"targets":{"build":{"inputs":["production","^production"]}}}');

    expect(text.indexOf('"production"')).toBeLessThan(text.indexOf('"^production"'));
  });
});

describe('field allow-list', () => {
  const KEPT = [
    'executor',
    'options',
    'configurations',
    'defaultConfiguration',
    'inputs',
    'outputs',
    'dependsOn',
    'cache',
    'continuous',
    'parallelism',
  ];

  test('keeps every behaviour-defining field and nothing else', () => {
    const fields = [...KEPT, 'metadata', 'description'].map((field) => `"${field}":1`).join(',');
    const text = snapshotOf(`{"targets":{"build":{${fields}}}}`);

    const printed = KEPT.filter((field) => text.includes(`"${field}":`));

    expect(printed).toStrictEqual(KEPT);
    expect(text).not.toContain('"metadata"');
    expect(text).not.toContain('"description"');
  });

  test('orders the keys of an object inside an array', () => {
    const text = snapshotOf('{"targets":{"build":{"inputs":[{"fileset":"x","dependencies":true}]}}}');

    expect(text.indexOf('"dependencies"')).toBeLessThan(text.indexOf('"fileset"'));
  });

  test('a project with no tags or targets is an empty snapshot', () => {
    expect(JSON.parse(snapshotOf('{}'))).toStrictEqual({ tags: [], targets: {} });
  });
});

describe('parseGraphNodes', () => {
  test('reads the nodes of a graph file', () => {
    const nodes = parseGraphNodes('{"graph":{"nodes":{"web":{"data":{"tags":["a"]}}}}}');

    expect(Object.keys(nodes)).toStrictEqual(['web']);
  });
});
