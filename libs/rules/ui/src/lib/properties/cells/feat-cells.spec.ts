import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FeatCategory, Rarity } from '@pioneer/rules/sdk';
import { beforeEach, describe, expect, it } from 'vitest';

import { featRow } from '../../testing/feat-picker-fixtures';
import { renderCell } from '../../testing/render-cell';
import { EntityNameCell } from './entity-name-cell.component';
import { FeatCategoryCell } from './feat-category-cell.component';
import { FeatTraitsCell } from './feat-traits-cell.component';

describe(FeatCategoryCell, () => {
  it('names the category in words', async () => {
    const host = await renderCell(FeatCategoryCell, { value: FeatCategory.Class });
    expect(host.textContent.trim()).toBe('Class');
  });
});

describe(FeatTraitsCell, () => {
  it('puts a rarity above common ahead of the traits', async () => {
    const entity = featRow({ id: 'a', name: 'A', rarity: Rarity.Rare, traits: [{ label: 'Fighter' }] });
    const host = await renderCell(FeatTraitsCell, { entity });
    const chips = [...host.querySelectorAll('fr-badge')].map((chip) => chip.textContent.trim());

    expect(chips).toStrictEqual(['Rare', 'Fighter']);
  });

  it('shows only the traits of a common feat', async () => {
    const entity = featRow({ id: 'a', name: 'A', traits: [{ label: 'Fighter' }] });
    const host = await renderCell(FeatTraitsCell, { entity });
    const chips = [...host.querySelectorAll('fr-badge')].map((chip) => chip.textContent.trim());

    expect(chips).toStrictEqual(['Fighter']);
  });
});

describe(EntityNameCell, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('links the name to the entry page when the row has one', async () => {
    const host = await renderCell(EntityNameCell, {
      entity: { id: 'not-an-id', name: 'Power Attack', entry: undefined, to: ['/content', 'feat', 'power-attack'] },
    });

    expect(host.querySelector('a')?.textContent.trim()).toBe('Power Attack');
  });

  it('shows the name as plain text when the row has no page', async () => {
    const host = await renderCell(EntityNameCell, {
      entity: { id: 'not-an-id', name: 'Power Attack', entry: undefined, to: undefined },
    });

    expect(host.querySelector('a')).toBeNull();
    expect(host.textContent.trim()).toBe('Power Attack');
  });
});
