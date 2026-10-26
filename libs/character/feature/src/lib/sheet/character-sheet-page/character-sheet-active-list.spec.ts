import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

const PACKS = cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Spell, ContentKind.Effect]);
const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;
const CALM = '1e8fd2ab-ffb3-5b91-af85-43e5911b8652';
const OAKEN_RESILIENCE = 'd649aded-ca36-5663-ba2c-edc97e35bd6c';
const ACTIVE = '00000000-0000-4000-8000-0000000000a5';
const TURN = { phase: 'turn', actions: 2, quickened: 0, reactionUsed: false };

/** A sustained Calm, cast at 1st rank with 10 rounds at most, in a turn with two actions left. */
function playWith(sustainedThisTurn: boolean, revision = 1, spell = CALM): object {
  const calm = { id: ACTIVE, spell, rank: 1, remaining: 10, sustainedThisTurn };
  return { revision, play: { hp: { damage: 0, temp: 0 }, turn: TURN, activeSpells: [calm] } };
}

function listOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-active-list'));
}

function countOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-active-count'));
}

function press(scope: HTMLElement, label: string): void {
  present([...scope.querySelectorAll('button')].find((button) => textOf(button) === label)).click();
}

/** Answers the next play edit and returns the command it carried. */
async function answerEdit(play: object): Promise<unknown> {
  let command: unknown = undefined;
  await vi.waitFor(() => {
    const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
    ({ command } = request.request.body as { command: unknown });
    request.flush({ ...play, events: [] });
  });
  return command;
}

describe('CharacterSheetPage active list', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('lists a sustained spell with where it came from and how long it can last', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Calm');
    });
    const text = textOf(listOf(root));
    expect(text).toContain('Cast by you');
    expect(text).toContain('Sustained');
    expect(text).toContain('10 rounds at most');
  });

  it('shows the count in the header', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(countOf(root))).toContain('Active (1)');
    });
  });

  it('spends one action to sustain it', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Calm');
    });
    press(listOf(root), 'Sustain');
    const command = await answerEdit(playWith(true, 2));
    expect(command).toMatchObject({
      field: 'spendAction',
      action: CALM,
      cost: { kind: 'actions', count: 1 },
      spell: { kind: 'sustain', id: ACTIVE },
    });
  });

  it('cannot sustain a spell that was sustained this turn', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(true), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Calm');
    });
    const button = [...listOf(root).querySelectorAll('button')].find((each) => textOf(each) === 'Sustain');
    expect(present(button).hasAttribute('disabled')).toBe(true);
  });

  it('dismisses a spell for free when its content needs no Dismiss action', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Calm');
    });
    press(listOf(root), 'Dismiss');
    const command = await answerEdit({ revision: 2, play: { hp: { damage: 0, temp: 0 }, turn: TURN } });
    expect(command).toStrictEqual({ field: 'dismissSpell', id: ACTIVE });
  });

  it('dismisses a spell with a note on how it ends early as freely as any other', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false, 1, OAKEN_RESILIENCE), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Oaken Resilience');
    });
    press(listOf(root), 'Dismiss');
    const command = await answerEdit({ revision: 2, play: { hp: { damage: 0, temp: 0 }, turn: TURN } });
    expect(command).toStrictEqual({ field: 'dismissSpell', id: ACTIVE });
  });

  it('shows how a spell ends early beside its Dismiss button', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false, 1, OAKEN_RESILIENCE), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Oaken Resilience');
    });
    const button = present([...listOf(root).querySelectorAll('button')].find((each) => textOf(each) === 'Dismiss'));
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('as a free action');
    });
  });

  it('dismisses on the first touch tap of a spell that has a note', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false, 1, OAKEN_RESILIENCE), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Oaken Resilience');
    });
    const button = present([...listOf(root).querySelectorAll('button')].find((each) => textOf(each) === 'Dismiss'));
    button.dispatchEvent(new PointerEvent('click', { bubbles: true, cancelable: true, pointerType: 'touch' }));
    const command = await answerEdit({ revision: 2, play: { hp: { damage: 0, temp: 0 }, turn: TURN } });
    expect(command).toStrictEqual({ field: 'dismissSpell', id: ACTIVE });
  });

  it('asks before End turn ends a spell that was not sustained, and ends the turn on confirm', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Calm');
    });
    const bar = present(root.querySelector<HTMLElement>('pio-sheet-turn-bar'));
    press(bar, 'End turn');
    await vi.waitFor(() => {
      expect(textOf(bar)).toContain('These spells end if you end your turn without sustaining them: Calm.');
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
    const confirm = [...bar.querySelectorAll('button')].findLast((button) => textOf(button) === 'End turn');
    present(confirm).click();
    const command = await answerEdit({ revision: 2, play: { hp: { damage: 0, temp: 0 }, turn: TURN } });
    expect(command).toStrictEqual({ field: 'endTurn' });
  });

  it('leaves the turn as it is when the player keeps going', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith(false), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(listOf(root))).toContain('Calm');
    });
    const bar = present(root.querySelector<HTMLElement>('pio-sheet-turn-bar'));
    press(bar, 'End turn');
    await vi.waitFor(() => {
      expect(textOf(bar)).toContain('Keep going');
    });
    press(bar, 'Keep going');
    await vi.waitFor(() => {
      expect(textOf(bar)).not.toContain('Keep going');
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });
});
