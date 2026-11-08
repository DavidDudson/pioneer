import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContentId, contentId, EntrySlug, PackId, SpellRank } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { provideEntryPreviews } from '../entry-preview/entry-preview';
import type { SpellDetailLine } from '../spell-list/spell-detail-line';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { SpellRowLine } from './spell-row-line';
import { SpellRowList } from './spell-row-list.component';

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

function detail(slug: string, name: string, source: string): SpellDetailLine {
  return {
    id: spellId(slug),
    name,
    rank: SpellRank.parse(1),
    cost: { kind: 'actions', cost: 'two', upTo: undefined },
    range: undefined,
    area: undefined,
    targets: undefined,
    defence: undefined,
    duration: undefined,
    effects: [],
    targetValues: [],
    counteract: false,
    tags: [],
    traits: [],
    source,
    variants: [],
  };
}

function line(slug: string, name: string, source: string): SpellRowLine {
  return { key: `${slug}:${source}`, detail: detail(slug, name, source) };
}

function render(lines: readonly SpellRowLine[] | undefined): ComponentFixture<SpellRowList> {
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      provideRouter([]),
      provideTanStackQuery(new QueryClient()),
      provideEntryPreviews({ preview: (): undefined => undefined, panel: () => undefined }),
    ],
  });
  const fixture = TestBed.createComponent(SpellRowList);
  fixture.componentRef.setInput('lines', lines);
  fixture.detectChanges();
  return fixture;
}

function rows(fixture: ComponentFixture<SpellRowList>): HTMLElement[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('pio-spell-row')];
}

describe(SpellRowList, () => {
  it('lists the spells in the order given, one row each', () => {
    const fixture = render([line('daze', 'Daze', 'Cleric Spellcasting'), line('heal', 'Heal', 'Divine Font')]);

    expect(rows(fixture).map((row) => row.textContent)).toStrictEqual([
      expect.stringContaining('Daze'),
      expect.stringContaining('Heal'),
    ]);
  });

  it('lists a spell known from two sources twice, each with its own source', () => {
    const fixture = render([line('heal', 'Heal', 'Cleric Spellcasting'), line('heal', 'Heal', 'Divine Font')]);

    const [first, second] = rows(fixture);
    expect(first?.textContent).toContain('Cleric Spellcasting');
    expect(second?.textContent).toContain('Divine Font');
  });

  it('says there are no spells when the list is empty', () => {
    const fixture = render([]);

    expect(rows(fixture)).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No spells yet');
  });

  it('shows a placeholder while the spells load', () => {
    const fixture = render(undefined);

    expect(rows(fixture)).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).querySelector('fr-skeleton')).not.toBeNull();
  });
});
