import { describe, expect, it } from 'vitest';

import { chooseSchema, openPlayground, pageText, secondTextArea, typeJson } from './playground-harness';

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
