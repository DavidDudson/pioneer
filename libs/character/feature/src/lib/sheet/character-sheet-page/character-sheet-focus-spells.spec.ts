import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter, 'spellcasting');

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core with its spells, for the focus spells' names. */
const SPELL_PACKS = cutTo(SPELL_CONTENT_KINDS);

/** Player Core's Arcane School, whose `ChoiceSet` (its first rule) picks the school, and the School of Battle Magic. */
const SCHOOL_SLOT = '6efbc394-745c-5c78-8df1-8a3ebe1cdec2:0';
const BATTLE_MAGIC = 'cf527c20-a4c9-5301-96f8-fa4da6be9af7';

/** Merisiel as a `name` of `level`, with `choices` picked besides. */
function as(name: 'bard' | 'wizard', level: number, choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    level,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId(name), ...choices }, spellAccess: [] },
  };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The focus spells list once its spells load, past the placeholder shown while they do. */
async function focusOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() =>
    present(
      [...root.querySelectorAll<HTMLElement>('pio-focus-spells')].find(
        (each) => each.querySelector('fr-heading') !== null,
      ),
    ),
  );
}

/** The text of a row's second line that opens it: its rank, or cantrip, before its traits and source. */
function rankOf(row: Element): Element {
  return present([...row.querySelectorAll('fr-text')].find((text) => text.closest('fr-hover-card') === null));
}

/** The element of a row that shows its name, which is where a keyboard reaches its summary. */
function nameOf(row: Element): HTMLElement {
  return present(row.querySelector<HTMLElement>('fr-hover-card [tabindex="0"], fr-hover-card a'));
}

/** Each spell's name and rank (or cantrip) as its two rows show them. */
function spellsIn(focus: HTMLElement): string[] {
  return [...focus.querySelectorAll('pio-spell-row')].map((row) =>
    [textOf(nameOf(row)), textOf(rankOf(row))].join(' '),
  );
}

/** What a spell row's summary shows: its labelled fields as "Term: value", and all its text. */
interface SpellSummary {
  readonly fields: string[];
  readonly text: string;
}

/** The summary the spell called `name` shows on focus: shown on focus. */
async function summaryOf(focus: HTMLElement, name: string): Promise<SpellSummary> {
  const row = [...focus.querySelectorAll('pio-spell-row')].find((each) => textOf(nameOf(each)) === name);
  nameOf(present(row)).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  const card = await vi.waitFor(() => present(document.querySelector<HTMLElement>('[role="tooltip"]')));
  return {
    fields: [...card.querySelectorAll('fr-description-item')].map((item) =>
      [...item.querySelectorAll('[role=term], [role=definition]')].map((part) => textOf(part)).join(': '),
    ),
    text: textOf(card),
  };
}

/** The play state of a character in its own turn with all three actions. */
function ownTurn(spendLog: readonly object[] = []): object {
  const turn = { phase: 'turn', actions: 3, quickened: 0, reactionUsed: false };
  return { revision: 1, play: { hp: { damage: 0, temp: 0 }, turn, spendLog } };
}

describe('CharacterSheetPage focus spells', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it("summarises a bard's composition spell by cost, area and duration on focus", async () => {
    const { root } = await openSheet(as('bard', 1), { packs: SPELL_PACKS });
    const focus = await focusOf(root);

    await vi.waitFor(() => {
      expect(spellsIn(focus)).toContain('Courageous Anthem Cantrip');
    });
    const summary = await summaryOf(focus, 'Courageous Anthem');
    expect(summary.fields).toStrictEqual(['Area: 60-foot emanation', 'Duration: 1 round']);
    expect(summary.text).toContain('Single action');
  });

  it("lists a bard's composition spells, the cantrip marked, with a focus pool of 1", async () => {
    const { root } = await openSheet(as('bard', 1), { packs: SPELL_PACKS });
    const focus = await focusOf(root);

    await vi.waitFor(() => {
      expect(spellsIn(focus)).toStrictEqual(['Counter Performance 1st rank', 'Courageous Anthem Cantrip']);
    });
    expect(textOf(focus)).toContain('Focus pool: 1 Focus Point');
    expect(textOf(focus)).toContain('Cast at 1st rank, cantrips too');
    expect(textOf(focus)).toContain('Occult');
  });

  it("casts a wizard's school spell at half the level, rounded up", async () => {
    const { root } = await openSheet(as('wizard', 5, { [SCHOOL_SLOT]: BATTLE_MAGIC }), { packs: SPELL_PACKS });
    const focus = await focusOf(root);

    await vi.waitFor(() => {
      expect(spellsIn(focus)).toStrictEqual(['Force Bolt 3rd rank']);
    });
    expect(textOf(focus)).toContain('Cast at 3rd rank, cantrips too');
    const summary = await summaryOf(focus, 'Force Bolt');
    expect(summary.fields).toStrictEqual(['Range: 30 feet', 'Targets: 1 creature', 'Effect: 2d4+2 force']);
  });

  it('shows no focus spells for a character with no focus entry', async () => {
    const { root } = await openSheet(as('wizard', 1), { packs: SPELL_PACKS });

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-prepared-spells')).not.toBeNull();
    });
    expect(root.querySelector('pio-focus-spells')).toBeNull();
  });

  it('casts a focus spell as a spend that pays a Focus Point and takes its reaction', async () => {
    const { root } = await openSheet(as('bard', 1), { packs: SPELL_PACKS, play: ownTurn() });
    const focus = await focusOf(root);
    await vi.waitFor(() => {
      expect(spellsIn(focus)).toContain('Counter Performance 1st rank');
    });

    const buttons = [...focus.querySelectorAll('pio-use-buttons button')];
    expect(buttons).toHaveLength(2);
    (buttons[0] as HTMLButtonElement).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        expectedRevision: 1,
        command: { field: 'spendAction', focus: true, cost: { kind: 'reaction' } },
      });
      request.flush({ ...ownTurn(), events: [] });
    });
  });

  it('offers no Use button for a cast the turn has no action left for', async () => {
    const spent = { phase: 'turn', actions: 0, quickened: 0, reactionUsed: true };
    const play = { revision: 1, play: { hp: { damage: 0, temp: 0 }, turn: spent } };
    const { root } = await openSheet(as('bard', 1), { packs: SPELL_PACKS, play });
    const focus = await focusOf(root);
    await vi.waitFor(() => {
      expect(spellsIn(focus)).toContain('Courageous Anthem Cantrip');
    });
    expect(focus.querySelectorAll('pio-use-buttons button')).toHaveLength(0);
  });
});
