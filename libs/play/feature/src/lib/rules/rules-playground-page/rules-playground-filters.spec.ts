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
