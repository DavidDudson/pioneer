import type { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { chooseSchema, openPlayground, pageText, present, typeInto, typeJson } from './playground-harness';

function queryInput(harness: RouterTestingHarness): HTMLInputElement {
  return present(present(harness.routeNativeElement).querySelector<HTMLInputElement>('fr-text-input input'));
}

describe('RulesPlaygroundPage content filters', () => {
  it('opens on the example entries filtered by the example query', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');

    const text = pageText(harness);
    expect(text).toContain('11 entries of 29 kept.');
    expect(text).toContain('As a link: ?f.level=..5&f.rarity=common,uncommon&f.traits=!fire');
    expect(text).toContain('Longsword (Weapon)');
    expect(text).not.toContain('Fireball (Spell)');
  });

  it('shows each kept entry’s source line (ADR-0005)', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');

    const lines = present(harness.routeNativeElement).querySelectorAll('pio-source-line');
    expect(lines).toHaveLength(11);
    expect(lines[0]?.textContent).toMatch(/^Player Core p\. \d+$/u);
  });

  it('labels facets and closed-set values', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');

    expect(pageText(harness)).toContain('Rarity');
    expect(pageText(harness)).toContain('Uncommon');
  });

  it('filters again as the query changes', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');
    await typeInto(harness, queryInput(harness), 'f.traits=fire');

    const text = pageText(harness);
    expect(text).toContain('Fireball (Spell)');
    expect(text).not.toContain('Longsword (Weapon)');
  });

  it('filters feats and actions by action cost', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');
    await typeInto(harness, queryInput(harness), 'f.action-cost=two');

    const text = pageText(harness);
    expect(text).toContain('Sudden Charge (Feat)');
    expect(text).not.toContain('Aid (Action)');
    expect(text).not.toContain('Fireball (Spell)');
  });

  it('labels feat and action facets', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');
    await typeInto(harness, queryInput(harness), '');

    const text = pageText(harness);
    expect(text).toContain('Feat type');
    expect(text).toContain('Mode');
    expect(text).toContain('Encounter');
  });

  it('filters equipment by weapon group and bulk', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');
    await typeInto(harness, queryInput(harness), 'f.weapon-group=sword');

    expect(pageText(harness)).toContain('Longsword (Weapon)');
    expect(pageText(harness)).not.toContain('Leather Armor (Armor)');

    await typeInto(harness, queryInput(harness), 'f.bulk=..1&f.magical=no');
    const text = pageText(harness);
    expect(text).not.toContain('Longsword (Weapon)');
    expect(text).toContain('Backpack (Equipment)');
  });

  it('labels equipment facets and shows bulk in Bulk', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');
    await typeInto(harness, queryInput(harness), '');

    const text = pageText(harness);
    expect(text).toContain('Weapon group');
    expect(text).toContain('Armor category');
    expect(text).toContain('Item type');
    expect(text).toContain('0.1');
  });

  it('says when nothing narrows the list', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');
    await typeInto(harness, queryInput(harness), '');

    expect(pageText(harness)).toContain('No filters: every entry is kept.');
    expect(pageText(harness)).toContain('29 entries of 29 kept.');
  });

  it('shows problems with the entries', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Content filters');
    await typeJson(harness, 'not json');

    expect(pageText(harness)).toContain('This is not valid JSON');
  });
});
