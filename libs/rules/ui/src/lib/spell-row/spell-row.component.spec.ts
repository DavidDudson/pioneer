import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ActionCost,
  ContentId,
  contentId,
  DamageFormula,
  EntrySlug,
  InlineKind,
  PackId,
  SpellRank,
} from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { ActionUser } from '../actions/action-user';
import type { UsableLine } from '../actions/action-user';
import { provideEntryPreviews } from '../entry-preview/entry-preview';
import type { EntryPreviews, PanelLink } from '../entry-preview/entry-preview';
import { INLINE_ROLLER } from '../rich-text/inline-roller';
import type { InlineRoller } from '../rich-text/inline-roller';
import type { SpellDetailLine } from '../spell-list/spell-detail-line';
import { SpellListMessage } from '../spell-list/spell-list-messages';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { SpellRow } from './spell-row.component';

const SPELL = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('spell:fireball')));
const PANEL: PanelLink = { to: ['/characters', 'sheet'], queryParams: { drawer: 'open', se: 'spell:fireball' } };
const ROLL = { type: InlineKind.Damage, instances: [{ formula: DamageFormula.parse('6d6') }] } as const;

const FIREBALL: SpellDetailLine = {
  id: SPELL,
  name: 'Fireball',
  rank: SpellRank.parse(3),
  cost: { kind: 'actions', cost: 'two', upTo: undefined },
  range: '500 feet',
  area: undefined,
  targets: undefined,
  defence: undefined,
  duration: undefined,
  effects: [{ key: '0', text: '6d6 fire', roll: ROLL }],
  targetValues: [],
  counteract: false,
  tags: [],
  traits: [{ label: 'Fire' }, { label: 'Manipulate' }],
  source: 'Sorcerer Spellcasting',
  variants: [],
};
const CAST: UsableLine = { id: SPELL, name: 'Fireball', cost: ActionCost.Two, affordable: true };

interface Page {
  readonly panel?: PanelLink | undefined;
  readonly roller?: InlineRoller;
  readonly spends?: boolean;
}

function render(spell: SpellDetailLine, { panel, roller, spends = true }: Page = {}): ComponentFixture<SpellRow> {
  const previews: EntryPreviews = { preview: (): undefined => undefined, panel: () => panel };
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      provideRouter([]),
      provideTanStackQuery(new QueryClient()),
      provideEntryPreviews(previews),
      ...(roller === undefined ? [] : [{ provide: INLINE_ROLLER, useValue: roller }]),
      ...(spends ? [{ provide: ActionUser, useValue: { use: vi.fn<ActionUser['use']>() } }] : []),
    ],
  });
  const fixture = TestBed.createComponent(SpellRow);
  fixture.componentRef.setInput('spell', spell);
  fixture.componentRef.setInput('use', CAST);
  fixture.detectChanges();
  return fixture;
}

function textOf(fixture: ComponentFixture<SpellRow>): string {
  return (fixture.nativeElement as HTMLElement).textContent.replaceAll(/\s+/gu, ' ').trim();
}

function buttons(fixture: ComponentFixture<SpellRow>): HTMLButtonElement[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
}

describe(SpellRow, () => {
  it('shows the name, then the rank and traits beside the source', () => {
    const text = textOf(render(FIREBALL));

    expect(text).toContain('Fireball');
    expect(text).toMatch(/3rd rank\s*Fire\s*Manipulate\s*Sorcerer Spellcasting/u);
  });

  it('says cantrip in place of a rank', () => {
    const text = textOf(render({ ...FIREBALL, tags: [SpellListMessage.TagCantrip] }));

    expect(text).toContain('Cantrip');
    expect(text).not.toContain('3rd rank');
  });

  it('rolls each damage part from its dice button, named for the spell', () => {
    const roller: InlineRoller = {
      hasStatistic: () => false,
      check: vi.fn<InlineRoller['check']>(),
      damage: vi.fn<InlineRoller['damage']>(),
    };
    const fixture = render(FIREBALL, { roller });

    const dice = buttons(fixture).find((button) => button.textContent.includes('6d6 fire'));
    dice?.click();

    expect(roller.damage).toHaveBeenCalledExactlyOnceWith({ node: ROLL, label: 'Fireball' });
  });

  it('has no dice button on a page that rolls nothing, and no cast button on one that spends nothing', () => {
    const fixture = render(FIREBALL, { spends: false });

    expect(buttons(fixture)).toHaveLength(0);
  });

  it('opens the spell in the side panel from its name when the page has one', () => {
    const fixture = render(FIREBALL, { panel: PANEL });

    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.textContent.trim()).toBe('Fireball');
  });
});
