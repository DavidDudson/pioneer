import { TestBed } from '@angular/core/testing';
import { DefenceStatusKind } from '@pioneer/rules/engine';
import type { Defences } from '@pioneer/rules/engine';
import { Predicate } from '@pioneer/rules/sdk';
import type { ContentId, DamageException, Immunity } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import {
  adjustment,
  ADAMANTINE,
  BARBARIAN_DEFENCES,
  DWARF,
  ENTRY_NAMES,
  FORM_DEFENCES,
  FIRE_RING,
  GOLEM_FORM,
  IN_DARKNESS,
  immunity,
  NO_DEFENCES,
  OUT_OF_RANGE,
  RAGE,
  SLEEP,
  WHILE_RAGING,
} from '../testing/defences-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { DefencesView } from './defences.component';

interface Names {
  readonly entries?: ReadonlyMap<ContentId, string>;
  readonly immunities?: ReadonlyMap<Immunity, string>;
  readonly exceptions?: ReadonlyMap<DamageException, string>;
}

/** One list as read: its heading, and each item's parts joined with " | ", or its empty line. */
interface ReadList {
  readonly heading: string;
  readonly items: readonly string[];
  readonly empty: string | undefined;
}

/** The three lists in page order, and each by name. */
interface Rendered {
  readonly lists: readonly ReadList[];
  readonly immunities: ReadList;
  readonly weaknesses: ReadList;
  readonly resistances: ReadList;
  /** Each line's origin chain as a sentence, without its sources, in document order. */
  readonly origins: readonly string[];
}

const NAMED: Names = { entries: ENTRY_NAMES };

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** An item's texts and badges in order, so the parts stay apart. */
function partsOf(item: Element): string {
  return [...item.querySelectorAll('fr-text, fr-badge')]
    .filter((part) => part.querySelector('fr-text, fr-badge') === null && part.closest('pio-origin-chain') === null)
    .map((part) => textOf(part))
    .join(' | ');
}

async function render(defences: Defences, names: Names = NAMED): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(DefencesView);
  fixture.componentRef.setInput('defences', defences);
  if (names.entries !== undefined) {
    fixture.componentRef.setInput('entryNames', names.entries);
  }
  if (names.immunities !== undefined) {
    fixture.componentRef.setInput('immunityNames', names.immunities);
  }
  if (names.exceptions !== undefined) {
    fixture.componentRef.setInput('exceptionNames', names.exceptions);
  }
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const lists = [...host.querySelectorAll('h3')].map((heading): ReadList => {
    const list = heading.closest('fr-stack');
    const items = [...(list?.querySelectorAll('[role="listitem"]') ?? [])].map((item) => partsOf(item));
    const empty = list?.querySelector('fr-empty-state');
    return {
      heading: textOf(heading),
      items,
      empty: empty === null || empty === undefined ? undefined : textOf(empty),
    };
  });
  const [immunities, weaknesses, resistances] = lists;
  if (immunities === undefined || weaknesses === undefined || resistances === undefined) {
    throw new Error('pio-defences rendered fewer than three lists');
  }
  const origins = [...host.querySelectorAll('pio-origin-chain')].map((chain) =>
    textOf(chain.querySelector('fr-text') ?? chain),
  );
  return { lists, immunities, weaknesses, resistances, origins };
}

describe(DefencesView, () => {
  it('lists immunities, weaknesses and resistances under level 3 headings, each empty one saying so', async () => {
    const { lists } = await render(NO_DEFENCES);

    expect(lists).toStrictEqual([
      { heading: 'Immunities', items: [], empty: 'No immunities.' },
      { heading: 'Weaknesses', items: [], empty: 'No weaknesses.' },
      { heading: 'Resistances', items: [], empty: 'No resistances.' },
    ]);
  });

  it("marks the lines a battle form gives as from the form, and the character's own beside them", async () => {
    const { immunities, resistances } = await render(FORM_DEFENCES);

    expect(immunities.items).toStrictEqual(['Immunity poison | from Golem Form']);
    expect(resistances.items).toStrictEqual([
      'Resistance 10 fire | from Golem Form',
      'Resistance 5 fire | Superseded | Golem Form counts instead.',
    ]);
  });

  it('marks nothing as from a form while none gives a line', async () => {
    const { lists } = await render(BARBARIAN_DEFENCES);

    expect(lists.flatMap(({ items }) => items).filter((item) => item.includes('from'))).toStrictEqual([]);
  });

  it('shows a skeleton shaped like each list while loading', async () => {
    TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
    const fixture = TestBed.createComponent(DefencesView);
    fixture.componentRef.setInput('defences', undefined);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('h3')).toHaveLength(0);
    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(6);
  });

  describe('immunities', () => {
    it('names a damage type and where the immunity comes from', async () => {
      const { immunities, origins } = await render({ ...NO_DEFENCES, immunities: [immunity(GOLEM_FORM, 'fire')] });

      expect(immunities.items).toStrictEqual(['Immunity fire']);
      expect(origins).toStrictEqual(['Golem Form']);
      expect(immunities.empty).toBeUndefined();
    });

    it('names an immunity that is not a damage type by the name the caller passes, else its slug', async () => {
      const defences = { ...NO_DEFENCES, immunities: [immunity(GOLEM_FORM, 'sleep')] };

      const { immunities: named } = await render(defences, {
        entries: ENTRY_NAMES,
        immunities: new Map([[SLEEP, 'sleep effects']]),
      });
      expect(named.items).toStrictEqual(['Immunity sleep effects']);

      TestBed.resetTestingModule();
      const { immunities: unnamed } = await render(defences);
      expect(unnamed.items).toStrictEqual(['Immunity sleep']);
    });
  });

  describe('weaknesses', () => {
    it('reads as its value and damage type', async () => {
      const { weaknesses } = await render({
        ...NO_DEFENCES,
        weaknesses: [adjustment(GOLEM_FORM, 'cold', { value: 5 })],
      });

      expect(weaknesses.items).toStrictEqual(['Weakness 5 cold']);
    });

    it('formats the value for the locale', async () => {
      const { weaknesses } = await render({
        ...NO_DEFENCES,
        weaknesses: [adjustment(GOLEM_FORM, 'cold', { value: 1500 })],
      });

      expect(weaknesses.items).toStrictEqual(['Weakness 1,500 cold']);
    });
  });

  describe('resistances', () => {
    it('spells out a group with the types it covers', async () => {
      const { resistances } = await render({
        ...NO_DEFENCES,
        resistances: [adjustment(RAGE, 'physical', { value: 3 }), adjustment(FIRE_RING, 'energy', { value: 5 })],
      });

      expect(resistances.items).toStrictEqual([
        'Resistance 3 physical (bleed, bludgeoning, piercing, slashing)',
        'Resistance 5 energy (acid, cold, electricity, fire, force, sonic, vitality, void)',
      ]);
    });

    it('reads the all group as all damage', async () => {
      const { resistances } = await render({ ...NO_DEFENCES, resistances: [adjustment(RAGE, 'all', { value: 2 })] });

      expect(resistances.items).toStrictEqual(['Resistance 2 all damage']);
    });

    it('lists exceptions after the target, by the names the caller passes, else their slugs', async () => {
      const resistance = adjustment(RAGE, 'physical', { value: 3, exceptions: ['adamantine', 'cold-iron'] });

      const { resistances } = await render(
        { ...NO_DEFENCES, resistances: [resistance] },
        { entries: ENTRY_NAMES, exceptions: new Map([[ADAMANTINE, 'Adamantine']]) },
      );

      expect(resistances.items).toStrictEqual([
        'Resistance 3 physical (bleed, bludgeoning, piercing, slashing), except Adamantine or cold-iron',
      ]);
    });
  });

  describe('standing', () => {
    it('marks a conditional defence in text, with when it holds', async () => {
      const { resistances } = await render({
        ...NO_DEFENCES,
        resistances: [
          adjustment(RAGE, 'fire', { value: 5, status: WHILE_RAGING }),
          adjustment(DWARF, 'cold', { value: 2, status: IN_DARKNESS }),
        ],
      });

      expect(resistances.items).toStrictEqual([
        'Resistance 5 fire | Conditional | Applies when you are raging.',
        'Resistance 2 cold | Conditional | Applies when you are in darkness.',
      ]);
    });

    it('marks a conditional defence without a summary by its badge alone', async () => {
      const unsummarised = {
        kind: DefenceStatusKind.Conditional,
        when: Predicate.parse(['self:effect:rage']),
        summary: undefined,
      };
      const { resistances } = await render({
        ...NO_DEFENCES,
        resistances: [adjustment(RAGE, 'fire', { value: 5, status: unsummarised })],
      });

      expect(resistances.items).toStrictEqual(['Resistance 5 fire | Conditional']);
    });

    it('marks a conditional immunity too', async () => {
      const { immunities } = await render({ ...NO_DEFENCES, immunities: [immunity(RAGE, 'mental', WHILE_RAGING)] });

      expect(immunities.items).toStrictEqual(['Immunity mental | Conditional | Applies when you are raging.']);
    });

    it('marks a superseded defence with what counts instead', async () => {
      const { resistances } = await render(BARBARIAN_DEFENCES);

      expect(resistances.items[1]).toBe('Resistance 5 fire | Superseded | Fire Resistance Ring counts instead.');
    });

    it('marks a failed defence with why, and no value', async () => {
      const { weaknesses } = await render({
        ...NO_DEFENCES,
        weaknesses: [adjustment(GOLEM_FORM, 'cold', { status: OUT_OF_RANGE })],
      });

      expect(weaknesses.items).toStrictEqual([
        'Weakness cold | Failed | A weakness or resistance may be at most 32767.',
      ]);
    });

    it('keeps saying a failed defence was conditional', async () => {
      const failedWhileRaging = { ...OUT_OF_RANGE, when: Predicate.parse(['self:effect:rage']) };
      const { weaknesses } = await render({
        ...NO_DEFENCES,
        weaknesses: [adjustment(GOLEM_FORM, 'cold', { status: failedWhileRaging })],
      });

      expect(weaknesses.items).toStrictEqual([
        'Weakness cold | Failed | A weakness or resistance may be at most 32767. It applies only in some situations.',
      ]);
    });

    it('shows two copies of one item as two lines', async () => {
      const ring = adjustment(FIRE_RING, 'fire', { value: 10 });
      const { resistances } = await render({ ...NO_DEFENCES, resistances: [ring, ring] });

      expect(resistances.items).toStrictEqual(['Resistance 10 fire', 'Resistance 10 fire']);
    });

    it('calls an origin without a display name an entry, never by id', async () => {
      const { origins } = await render(
        { ...NO_DEFENCES, weaknesses: [adjustment(GOLEM_FORM, 'cold', { value: 5 })] },
        { entries: new Map() },
      );

      expect(origins).toStrictEqual(['an entry']);
    });
  });
});
