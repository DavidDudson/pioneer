import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { optionElements, press, render, stubLayout } from './combobox-testing';
import { Combobox } from './combobox.component';

/** The text of each badge in `option`. */
function badgesOf(option: HTMLElement | undefined): readonly string[] {
  return [...(option?.querySelectorAll('fr-badge') ?? [])].map((badge) => badge.textContent.trim());
}

describe(`${Combobox.name} option tags`, () => {
  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the tags of an option under its name', async () => {
    const rendered = render([
      { value: 'grease', label: 'Grease' },
      { value: 'fireball', label: 'Fireball', tags: [{ label: 'Spell' }, { label: 'Level 3' }, { label: 'fire' }] },
    ]);
    await press(rendered, 'ArrowDown');
    expect(badgesOf(optionElements(rendered)[1])).toStrictEqual(['Spell', 'Level 3', 'fire']);
  });

  it('shows no badges on an option without tags', async () => {
    const rendered = render([
      { value: 'grease', label: 'Grease' },
      { value: 'fireball', label: 'Fireball', tags: [{ label: 'Spell' }] },
    ]);
    await press(rendered, 'ArrowDown');
    expect(badgesOf(optionElements(rendered)[0])).toStrictEqual([]);
    expect(optionElements(rendered)).toHaveLength(2);
  });
});
