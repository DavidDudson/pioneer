import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import type { SpellData } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { DISPEL_MAGIC, FIREBALL, HEAL, lineOf } from '../testing/spell-fixtures';
import type { SpellDetailLine } from './spell-detail-line';
import { SpellDetails } from './spell-details.component';
import { SpellListMessage } from './spell-list-messages';

interface Rendered {
  readonly fixture: ComponentFixture<SpellDetails>;
  readonly line: SpellDetailLine;
}

async function render(data: SpellData, rank: number, tags: readonly string[] = []): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const transloco = TestBed.inject(TranslocoService);
  const line = lineOf({ slug: 'spell', name: 'Spell', data, rank, tags }, (key, params) =>
    transloco.translate(key, params),
  );
  const fixture = TestBed.createComponent(SpellDetails);
  fixture.componentRef.setInput('spell', line);
  await fixture.whenStable();
  return { fixture, line };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The labelled fields as "Term: value". */
function fieldRows(fixture: ComponentFixture<SpellDetails>): string[] {
  const host = fixture.nativeElement as HTMLElement;
  return [...host.querySelectorAll('fr-description-item')].map((row) =>
    [...row.querySelectorAll('[role=term], [role=definition]')].map((part) => textOf(part)).join(': '),
  );
}

describe(SpellDetails, () => {
  it('lists the fields the spell has at the cast rank', async () => {
    const { fixture } = await render(FIREBALL, 5);

    expect(fieldRows(fixture)).toStrictEqual([
      'Range: 500 feet',
      'Area: 20-foot burst',
      'Defense: basic Reflex',
      'Effect: 10d6 fire',
    ]);
  });

  it('shows the cost as action glyphs a screen reader can name', async () => {
    const { fixture } = await render(FIREBALL, 3);
    const glyph = (fixture.nativeElement as HTMLElement).querySelector('fr-glyph');

    expect(glyph?.textContent).toContain('◆◆');
    expect(glyph?.textContent).toContain('Two actions');
  });

  it('shows a variable cost as a run of glyphs', async () => {
    const { fixture } = await render(HEAL, 1);
    const text = textOf(fixture.nativeElement as HTMLElement);

    expect(text).toContain('Single action');
    expect(text).toContain('to');
    expect(text).toContain('Three actions');
  });

  it('lists each variant under its name', async () => {
    const { fixture } = await render(HEAL, 3);
    const text = textOf(fixture.nativeElement as HTMLElement);

    expect(text).toContain('One action');
    expect(text).toContain('touch');
    expect(text).toContain('Two actions');
    expect(text).toContain('30 feet');
  });

  it('marks a spell that counteracts and carries its tags', async () => {
    const { fixture } = await render(DISPEL_MAGIC, 2, [SpellListMessage.TagSignature]);
    const badges = [...(fixture.nativeElement as HTMLElement).querySelectorAll('fr-badge')].map((badge) =>
      textOf(badge),
    );

    expect(badges).toStrictEqual(['Signature', 'Counteract']);
  });
});
