import { describe, expect, test } from 'bun:test';

import { findCoverageGaps, specOf, storyOf } from './component-coverage.ts';

const BUTTON = 'actions/button/button.component.ts';
const ITEM = 'list/list-item/list-item.component.ts';
const LIST_SPEC = 'list/list/list.component.spec.ts';
const LIST_STORY = 'list/list/list.stories.ts';

function tree(...files: string[]): Set<string> {
  return new Set(files);
}

describe('specOf', () => {
  test('names the sibling spec', () => {
    expect(specOf(BUTTON)).toBe('actions/button/button.component.spec.ts');
  });
});

describe('storyOf', () => {
  test('names the sibling story', () => {
    expect(storyOf(BUTTON)).toBe('actions/button/button.stories.ts');
  });
});

describe('findCoverageGaps', () => {
  test('passes a component with a sibling spec and story', () => {
    const files = tree(BUTTON, specOf(BUTTON), storyOf(BUTTON));
    expect(findCoverageGaps(files, {})).toStrictEqual([]);
  });

  test('reports a missing spec and a missing story', () => {
    expect(findCoverageGaps(tree(BUTTON), {})).toStrictEqual([`no spec: ${BUTTON}`, `no story: ${BUTTON}`]);
  });

  test("does not count another component's story, even in the same folder", () => {
    const files = tree(BUTTON, specOf(BUTTON), 'actions/button/icon-button.stories.ts');
    expect(findCoverageGaps(files, {})).toStrictEqual([`no story: ${BUTTON}`]);
  });

  test('ignores files that are not components', () => {
    expect(findCoverageGaps(tree('async/async-action.ts', 'testing/field-harness.ts'), {})).toStrictEqual([]);
  });

  test('passes an exempt part whose covering spec and story exist', () => {
    const files = tree(ITEM, LIST_SPEC, LIST_STORY);
    const exemptions = { [ITEM]: { reason: 'A list row.', spec: LIST_SPEC, story: LIST_STORY } };
    expect(findCoverageGaps(files, exemptions)).toStrictEqual([]);
  });

  test('still reports what an exemption does not cover', () => {
    const files = tree(ITEM, LIST_SPEC);
    const exemptions = { [ITEM]: { reason: 'A list row.', spec: LIST_SPEC } };
    expect(findCoverageGaps(files, exemptions)).toStrictEqual([`no story: ${ITEM}`]);
  });

  test('reports an exemption pointing at a missing file', () => {
    const files = tree(ITEM, LIST_STORY);
    const exemptions = { [ITEM]: { reason: 'A list row.', spec: LIST_SPEC, story: LIST_STORY } };
    expect(findCoverageGaps(files, exemptions)).toStrictEqual([
      `spec for ${ITEM} points at a missing file: ${LIST_SPEC}`,
    ]);
  });

  test('reports exemptions that are no longer needed', () => {
    const files = tree(ITEM, specOf(ITEM), 'list/list-item/list-item.stories.ts', LIST_SPEC, LIST_STORY);
    const exemptions = { [ITEM]: { reason: 'A list row.', spec: LIST_SPEC, story: LIST_STORY } };
    expect(findCoverageGaps(files, exemptions)).toStrictEqual([
      `spec exemption no longer needed, it has its own: ${ITEM}`,
      `story exemption no longer needed, it has its own: ${ITEM}`,
    ]);
  });

  test('reports an exemption for a component that is gone', () => {
    const exemptions = { [ITEM]: { reason: 'A list row.', spec: LIST_SPEC } };
    expect(findCoverageGaps(tree(LIST_SPEC), exemptions)).toStrictEqual([
      `exemption for a component that no longer exists: ${ITEM}`,
    ]);
  });
});
