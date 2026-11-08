import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter, 'spellcasting');

/** Player Core with its spells, for the spell pickers. */
const SPELL_PACKS = cutTo(SPELL_CONTENT_KINDS);

/** Player Core's Soothe, a 1st-rank occult spell. */
const SOOTHE = '272d555d-f777-5439-b02b-cc5325c0a648';

/** Player Core 2's id for the entry with `slug`. */
function playerCore2(slug: string): string {
  return contentId(PackId.parse('player-core-2'), EntrySlug.parse(slug));
}

/** Merisiel as a bard of `level`, with `choices` picked besides. */
function bard(level: number, choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    level,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('bard'), ...choices }, spellAccess: [] },
  };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The spell pickers, once they show. */
async function pickersOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-prepared-spells')));
}

function headingsIn(pickers: HTMLElement): string[] {
  return [...pickers.querySelectorAll('fr-heading')].map((heading) => textOf(heading));
}

/** The labels of the inline pickers within `root`. */
function pickerLabels(root: HTMLElement): string[] {
  return [...root.querySelectorAll('fr-inline-field')].map((field) => textOf(present(field.querySelector('fr-text'))));
}

describe('CharacterSheetPage spell repertoire', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it("asks a 1st-level bard for its repertoire's cantrips and 1st-rank spells, with no signature spell yet", async () => {
    const { root } = await openSheet(bard(1));
    const pickers = await pickersOf(root);

    await vi.waitFor(() => {
      expect(headingsIn(pickers)).toStrictEqual(['Spell repertoire: Occult', 'Cantrips, cast at 1st rank', '1st rank']);
    });
    expect(pickerLabels(pickers).slice(-2)).toStrictEqual(['1st rank spell 1', '1st rank spell 2']);
    expect(textOf(pickers)).not.toContain('signature');
  });

  it('asks a 3rd-level bard for a signature spell after each rank’s spells', async () => {
    const { root } = await openSheet(bard(3));
    const pickers = await pickersOf(root);

    await vi.waitFor(() => {
      expect(pickerLabels(pickers)).toContain('2nd rank signature spell');
    });
    const labels = pickerLabels(pickers);
    expect(labels.slice(labels.indexOf('1st rank spell 3'), labels.indexOf('1st rank spell 3') + 2)).toStrictEqual([
      '1st rank spell 3',
      '1st rank signature spell',
    ]);
    expect(labels.at(-1)).toBe('2nd rank signature spell');
    expect(textOf(pickers)).toContain(
      "Choose this rank's repertoire spells first, then one of them as its signature spell.",
    );
  });

  it('says a signature spell is cast at any rank from its own to the highest', async () => {
    const choices = { 'repertoire:bard:1:0': SOOTHE, 'signature:bard:1': SOOTHE };
    const { root } = await openSheet(bard(3, choices), { packs: SPELL_PACKS });
    const pickers = await pickersOf(root);

    await vi.waitFor(() => {
      expect(textOf(pickers)).toContain('Soothe, the signature spell, is cast at any rank from 1st to 2nd.');
    });
  });
});

/** The name of a spell row, which is where a keyboard reaches its summary. */
function nameOf(row: Element): HTMLElement {
  return present(row.querySelector<HTMLElement>('fr-hover-card [tabindex="0"], fr-hover-card a'));
}

/** The rank line of each spell row under `root`, as its second row words it. */
function ranksIn(root: HTMLElement): string[] {
  return [...root.querySelectorAll('pio-spell-row')].map((row) =>
    textOf(present([...row.querySelectorAll('fr-text')].find((text) => text.closest('fr-hover-card') === null))),
  );
}

/** The labelled fields of the summary a spell row shows on focus, as "Term: value", closed again after. */
async function summaryOf(row: Element): Promise<string[]> {
  const name = nameOf(row);
  name.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  const card = await vi.waitFor(() => present(document.querySelector<HTMLElement>('[role="tooltip"]')));
  const fields = [...card.querySelectorAll('fr-description-item')].map((item) =>
    [...item.querySelectorAll('[role=term], [role=definition]')].map((part) => textOf(part)).join(': '),
  );
  name.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  await vi.waitFor(() => {
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
  return fields;
}

describe('CharacterSheetPage spell details', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('shows a repertoire spell under its picker at the rank it is cast, and summarises it on focus', async () => {
    const choices = { 'repertoire:bard:1:0': SOOTHE, 'signature:bard:1': SOOTHE };
    const { root } = await openSheet(bard(3, choices), { packs: SPELL_PACKS });
    const pickers = await pickersOf(root);

    const soothe = ['Range: 30 feet', 'Targets: 1 willing creature', 'Duration: 1 minute'];

    await vi.waitFor(() => {
      expect(ranksIn(pickers)).toStrictEqual(['1st rank', '2nd rank']);
    });
    const [first, second] = [...pickers.querySelectorAll('pio-spell-row')];
    await expect(summaryOf(present(first))).resolves.toStrictEqual([
      ...soothe.slice(0, 2),
      'Effect: 1d10+4 healing',
      soothe[2],
    ]);
    await expect(summaryOf(present(second))).resolves.toStrictEqual([
      ...soothe.slice(0, 2),
      'Effect: 2d10+8 healing',
      soothe[2],
    ]);
  });
});

/** Merisiel as a demonic sorcerer of `level`. */
function demonicSorcerer(level: number): object {
  const choices = {
    ...MERISIEL.build.choices,
    class: playerCore2('class:sorcerer'),
    [`${playerCore2('class-feature:bloodline')}:0`]: playerCore2('class-feature:bloodline-demonic'),
  };
  return { ...MERISIEL, level, build: { choices, spellAccess: [] } };
}

describe('CharacterSheetPage granted repertoire spells', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it("lists a bloodline's gift as read-only text in place of the first picker of its rank", async () => {
    const { root } = await openSheet(demonicSorcerer(1), { packs: SPELL_PACKS });
    const pickers = await pickersOf(root);

    await vi.waitFor(() => {
      expect(textOf(pickers)).toContain('Fear, always known');
    });
    expect(textOf(pickers)).toContain('Caustic Blast, always known');
    expect(pickerLabels(pickers)).not.toContain('1st rank spell 1');
    expect(pickerLabels(pickers)).toContain('1st rank spell 2');
  });
});

describe('CharacterSheetPage repertoire swaps', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  // The spell table can't be driven in this harness (#734), so this checks only that the sheet reads a swap record.
  // A refused swap's reason shows as every server refusal does (character-sheet-page.component.spec.ts).
  it("reads a character that has swapped a repertoire spell this level, keeping the swapped spell's picker", async () => {
    const choices = { 'repertoire:bard:1:0': SOOTHE };
    const swapped = {
      ...bard(5, choices),
      build: {
        choices: { ...MERISIEL.build.choices, class: playerCoreClassId('bard'), ...choices },
        spellAccess: [],
        repertoireSwaps: [{ level: 5, slot: 'repertoire:bard:1:0' }],
      },
    };
    const { root } = await openSheet(swapped, { packs: SPELL_PACKS });
    const pickers = await pickersOf(root);

    await vi.waitFor(() => {
      expect(pickerLabels(pickers)).toContain('1st rank spell 1');
    });
  });
});
