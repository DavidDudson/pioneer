import { describe, expect, it } from 'vitest';

import {
  chooseIn,
  chooseSchema,
  openPlayground,
  pageText,
  secondTextArea,
  textAreas,
  typeJson,
} from './playground-harness';

describe('RulesPlaygroundPage grants', () => {
  it('resolves grants from the roots down, with the chain behind each entry', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Grants');

    const text = pageText(harness);
    const expected = [
      'On the character',
      'Reactive Strike',
      'Granted through Fighter → Shield Block (fighter)',
      'Already on the character',
      'Depends on the situation',
      'Climb in forest',
      'It holds when you are in forest.',
    ];
    expect(expected.filter((shown) => !text.includes(shown))).toStrictEqual([]);
    expect(text).not.toContain('Battlefield Surveyor');
  });

  it('shows a grant cycle with text from the grants bundle', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Grants');
    await typeJson(
      harness,
      '[{ "slug": "fighter", "name": "Fighter", "rules": [{ "key": "GrantItem", "item": "fighter" }] }]',
    );

    expect(pageText(harness)).toContain('Fighter grants itself.');
  });

  it('answers an open choice from its select and grants the pick', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Grants');
    expect(pageText(harness)).toContain('Choices to make');

    await chooseIn(harness, 'Fighter feat (fighter:4)', 'Sudden Charge');

    const text = pageText(harness);
    expect(text).toContain('Picked sudden-charge');
    expect(text).toContain('weapon-group:sword');
    expect(text).not.toContain('Choices to make');
    expect(textAreas(harness).some((area) => area.value.includes('fighter:4 = sudden-charge'))).toBe(true);
  });

  it('says so when a query matches no entry', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Grants');
    await typeJson(
      harness,
      '[{ "slug": "fighter", "name": "Fighter", "rules": [{ "key": "ChoiceSet", "flag": "feat", "choices": { "kind": "feat", "filter": ["item:trait:wizard"] } }] }]',
    );

    expect(pageText(harness)).toContain('No content entry matches this choice yet.');
  });

  it('flags a root that is not a slug', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Grants');

    const roots = secondTextArea(harness);
    roots.value = 'Fighter!';
    roots.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    expect(pageText(harness)).toContain('Line 1 is not a slug.');
    expect(roots.getAttribute('aria-invalid')).toBe('true');
  });
});
