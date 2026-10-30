import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { pickRow } from '../../testing/option-picker-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core's character kinds and its conditions. */
const PACKS = cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Condition]);

const FRIGHTENED = '4218b8f3-1756-50cd-a914-6ce750659a62';
const CLUMSY = '69f88e3c-d871-5fb9-82c6-120348a7c0e8';
const GRABBED = 'cab530ff-ca20-5f0a-8a5e-b9fdb322b146';
const BLINDED = '5d63458a-cde5-5d64-8fea-b920f04f36b7';
const DAZZLED = '943dfd55-ad09-5abf-9138-95a6149d3302';
const FIRST = '00000000-0000-4000-8000-000000000001';
const SECOND = '00000000-0000-4000-8000-000000000002';

const UNLIMITED = { kind: 'unlimited' };

/** The play state of a full-health character with `conditions` on it, at `revision`. */
function afflictedWith(conditions: readonly object[], revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, conditions } };
}

const frightened = (value: number): object => ({ id: FIRST, condition: FRIGHTENED, value, duration: UNLIMITED });
const clumsy = (value: number): object => ({ id: FIRST, condition: CLUMSY, value, duration: UNLIMITED });

function conditionsOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-conditions'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...conditionsOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

/** Answers the pending edit of the play state with `answer`, after checking what was sent. */
async function answerEdit(command: object, answer: object): Promise<void> {
  await vi.waitFor(() => {
    const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
    expect(request.request.body).toMatchObject({ expectedRevision: 1, command });
    request.flush(answer);
  });
}

describe('CharacterSheetPage conditions', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('says so when the character has no conditions', async () => {
    const { root } = await openSheet(undefined, { play: afflictedWith([]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toContain('No conditions');
    });
  });

  it('shows each condition with its value', async () => {
    const { root } = await openSheet(undefined, { play: afflictedWith([frightened(2)]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toMatch(/Frightened\s*2/u);
    });
  });

  it('lists the conditions a condition implies under it, without a remove button of their own', async () => {
    const grabbed = { id: FIRST, condition: GRABBED, duration: UNLIMITED };
    const { root } = await openSheet(undefined, { play: afflictedWith([grabbed]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toContain('Also: Immobilized');
    });
    expect(textOf(conditionsOf(root))).toContain('Also: Off-Guard');
    expect([...conditionsOf(root).querySelectorAll('button')].filter((each) => textOf(each) === 'Remove')).toHaveLength(
      1,
    );
  });

  it('marks a condition that another one on the character replaces', async () => {
    const blinded = { id: FIRST, condition: BLINDED, duration: UNLIMITED };
    const dazzled = { id: SECOND, condition: DAZZLED, duration: UNLIMITED };
    const { root } = await openSheet(undefined, { play: afflictedWith([blinded, dazzled]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toContain('Replaced by Blinded');
    });
  });

  it('opens a preview of a condition with its value applied, listing the statistics it changes', async () => {
    const { root } = await openSheet(undefined, { play: afflictedWith([clumsy(2)]), packs: PACKS });
    const trigger = await vi.waitFor(() =>
      present(conditionsOf(root).querySelector<HTMLElement>('fr-hover-card [tabindex="0"]')),
    );
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    await vi.waitFor(async () => {
      await TestBed.inject(ApplicationRef).whenStable();
      const card = textOf(present(document.querySelector<HTMLElement>('[role="tooltip"]')));
      expect(card).toMatch(/Clumsy\s*2/u);
      expect(card).toContain('Changes for this character');
      expect(card).toContain('Armor Class -2 status');
      expect(card).toContain('Reflex -2 status');
    });
  });

  it('raises a value at the revision last read, and shows what the server answers', async () => {
    const { root } = await openSheet(undefined, { play: afflictedWith([frightened(2)]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toMatch(/Frightened\s*2/u);
    });

    buttonOf(root, 'Raise').click();

    await answerEdit({ field: 'setConditionValue', id: FIRST, value: 3 }, afflictedWith([frightened(3)], 2));
    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toMatch(/Frightened\s*3/u);
    });
  });

  it('cannot lower a condition below 1: it is removed instead', async () => {
    const { root } = await openSheet(undefined, { play: afflictedWith([frightened(1)]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toMatch(/Frightened\s*1/u);
    });

    expect(buttonOf(root, 'Lower').disabled).toBe(true);
  });

  it('removes a condition', async () => {
    const { root } = await openSheet(undefined, { play: afflictedWith([frightened(2)]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toMatch(/Frightened\s*2/u);
    });

    buttonOf(root, 'Remove').click();

    await answerEdit({ field: 'removeCondition', id: FIRST }, afflictedWith([], 2));
    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toContain('No conditions');
    });
  });

  it('adds the condition picked, with a value only when it carries one', async () => {
    const { harness, root } = await openSheet(undefined, { play: afflictedWith([]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(conditionsOf(root))).toContain('No conditions');
    });
    expect(buttonOf(root, 'Add').disabled).toBe(true);

    pickRow(harness, conditionsOf(root), { matches: (label) => label === 'Blinded' });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(buttonOf(root, 'Add').disabled).toBe(false);
    buttonOf(root, 'Add').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      const { command } = request.request.body as { command: { condition: Record<string, unknown> } };
      expect(command).toMatchObject({ field: 'addCondition', condition: { condition: BLINDED, duration: UNLIMITED } });
      expect(command.condition).not.toHaveProperty('value');
      request.flush(afflictedWith([{ id: FIRST, condition: BLINDED, duration: UNLIMITED }], 2));
    });
  });
});
