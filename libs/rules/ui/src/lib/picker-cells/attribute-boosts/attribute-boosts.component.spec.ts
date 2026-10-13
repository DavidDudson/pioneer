import { Attribute } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { AttributeBoosts } from './attribute-boosts.component';

function badges(host: HTMLElement): readonly string[] {
  return [...host.querySelectorAll('fr-badge')].map((badge) => {
    const parts = [...badge.querySelectorAll('fr-text')].map((part) => part.textContent.trim());
    return parts.length === 0 ? badge.textContent.trim() : parts.join(' ');
  });
}

describe(AttributeBoosts, () => {
  it('names a fixed boost and a choice between two', async () => {
    const host = await renderCell(AttributeBoosts, {
      boosts: [[Attribute.Constitution], [Attribute.Strength, Attribute.Dexterity]],
    });
    expect(badges(host)).toStrictEqual(['Constitution', 'Strength or Dexterity']);
  });

  it('calls a boost open to every attribute free', async () => {
    const host = await renderCell(AttributeBoosts, { boosts: [Object.values(Attribute)] });
    expect(badges(host)).toStrictEqual(['Free boost']);
  });
});
