import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Dc } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import type { RollView } from '../roll-view';
import { providePlayUiI18nTesting } from '../testing/provide-play-ui-testing';
import {
  ADJUSTED_DEGREE,
  BASIC_SAVE_FAILURE,
  CANCELLED_CHECK,
  CRITICAL_FAILURE,
  CRITICAL_SUCCESS,
  FAILURE,
  FORTUNE_CHECK,
  MISFORTUNE_CHECK,
  PLAIN_CHECK,
  SUCCESS,
  TOGGLE_REASONS,
  UNWORDED_SUCCESS,
  WITH_TOGGLES,
  WORDED_FAILURE,
} from '../testing/roll-fixtures';
import { RollCard } from './roll-card.component';

async function render(
  roll: RollView,
  inputs: { readonly dc?: Dc | undefined; readonly dcEditable?: boolean } = {},
): Promise<ComponentFixture<RollCard>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [providePlayUiI18nTesting()] });
  const fixture = TestBed.createComponent(RollCard);
  fixture.componentRef.setInput('roll', roll);
  if (inputs.dc !== undefined) {
    fixture.componentRef.setInput('dc', inputs.dc);
  }
  fixture.componentRef.setInput('dcEditable', inputs.dcEditable ?? false);
  await fixture.whenStable();
  return fixture;
}

function hostOf(fixture: ComponentFixture<RollCard>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

function textOf(host: HTMLElement): string {
  return host.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The degree's badge: the status-tinted label that leads the degree. */
function degreeBadge(host: HTMLElement): HTMLElement | null {
  return host.querySelector('pio-roll-degree fr-badge');
}

describe(RollCard, () => {
  it('shows a plain roll: the expression, the total and the d20 and modifier behind it', async () => {
    const text = textOf(hostOf(await render(PLAIN_CHECK)));
    expect(text).toContain('1d20+7');
    expect(text).toContain('Total 19');
    expect(text).toContain('12');
    expect(text).not.toContain('discarded');
    expect(text).not.toContain('Success');
  });

  it('shows both d20s with fortune, marking the kept one', async () => {
    const text = textOf(hostOf(await render(FORTUNE_CHECK)));
    expect(text).toContain('Total 21');
    expect(text).toContain('Roll 1: 12, discarded');
    expect(text).toContain('Roll 2: 21, kept');
    expect(text).toContain('Fortune: rolled twice and kept the higher.');
  });

  it('shows both d20s with misfortune, keeping the lower', async () => {
    const text = textOf(hostOf(await render(MISFORTUNE_CHECK)));
    expect(text).toContain('Total 12');
    expect(text).toContain('Roll 1: 21, discarded');
    expect(text).toContain('Roll 2: 12, kept');
    expect(text).toContain('Misfortune: rolled twice and kept the lower.');
  });

  it('says fortune and misfortune cancelled, and shows one roll', async () => {
    const text = textOf(hostOf(await render(CANCELLED_CHECK)));
    expect(text).toContain('Fortune and misfortune cancel out: rolled once.');
    expect(text).not.toContain('discarded');
  });

  it.each([
    { name: 'a critical success', roll: CRITICAL_SUCCESS, label: 'Critical success', tone: 'success' },
    { name: 'a success', roll: SUCCESS, label: 'Success', tone: 'success' },
    { name: 'a failure', roll: FAILURE, label: 'Failure', tone: 'warning' },
    { name: 'a critical failure', roll: CRITICAL_FAILURE, label: 'Critical failure', tone: 'danger' },
  ])('tints $name by how it went', async ({ roll, label, tone }) => {
    const host = hostOf(await render(roll));
    const badge = present(degreeBadge(host));
    const classes = present(badge.firstElementChild).className;

    expect(badge.textContent.trim()).toBe(label);
    expect(classes).toContain(tone);
  });

  it('shows a degree an effect moved from the one the roll reached, and what moved it', async () => {
    const host = hostOf(await render(ADJUSTED_DEGREE));

    expect(present(degreeBadge(host)).textContent.trim()).toBe('Critical success');
    expect(textOf(host)).toContain('Success to Critical success, from Juggernaut');
  });

  it('shows the words a check in text gives for the degree rolled', async () => {
    const host = hostOf(await render(WORDED_FAILURE));
    expect(textOf(host)).toContain('You flee for 1 round.');
  });

  it('shows what a basic save does at the degree rolled', async () => {
    const host = hostOf(await render(BASIC_SAVE_FAILURE));
    expect(textOf(host)).toContain('Takes full damage');
  });

  it('shows no outcome when the check has no words for the degree rolled', async () => {
    const host = hostOf(await render(UNWORDED_SUCCESS));
    const text = textOf(host);
    expect(text).not.toContain('You flee');
    expect(text).not.toContain('Takes');
  });

  it('says nothing of a degree without a DC', async () => {
    const host = hostOf(await render(PLAIN_CHECK));

    expect(degreeBadge(host)).toBeNull();
  });

  it('offers a DC box only when asked, holding the DC it is given', async () => {
    const plain = hostOf(await render(PLAIN_CHECK));
    expect(plain.querySelector('input')).toBeNull();

    const host = hostOf(await render(SUCCESS, { dc: Dc.parse(15), dcEditable: true }));

    expect(present(host.querySelector('input')).value).toBe('15');
  });

  it.each([
    { name: 'a DC', typed: '18', expected: [Dc.parse(18)] },
    { name: 'an emptied box', typed: '', expected: [undefined], dc: Dc.parse(15) },
    { name: 'exponent notation', typed: '1e1', expected: [] },
    { name: 'letters', typed: 'ab', expected: [] },
  ])('emits for $name as typed', async ({ typed, expected, dc }) => {
    const fixture = await render(PLAIN_CHECK, { dc, dcEditable: true });
    const emitted: (Dc | undefined)[] = [];
    fixture.componentInstance.dcChange.subscribe((typedDc) => {
      emitted.push(typedDc);
    });
    const input = present(hostOf(fixture).querySelector('input'));

    input.value = typed;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(emitted).toStrictEqual(expected);
  });

  it('flags text that is no DC', async () => {
    const fixture = await render(PLAIN_CHECK, { dcEditable: true });
    const input = present(hostOf(fixture).querySelector('input'));

    input.value = 'ab';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(textOf(hostOf(fixture))).toContain('Enter a DC as a whole number.');
  });

  it('says which toggles the roll was made with, and nothing for a plain roll', async () => {
    const plain = textOf(hostOf(await render(PLAIN_CHECK)));
    expect(plain).not.toContain('Rolled with');

    const toggled = textOf(hostOf(await render(WITH_TOGGLES)));
    expect(toggled).toContain('Rolled with');
    for (const reason of TOGGLE_REASONS) {
      expect(toggled).toContain(reason);
    }
  });
});
