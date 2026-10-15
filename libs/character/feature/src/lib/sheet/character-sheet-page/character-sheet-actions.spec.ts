import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { RANDOM_SOURCE } from '@pioneer/play/ui';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { render, settle, textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';

const PACKS = cutTo(ACTION_CONTENT_KINDS);

const FIGHTER = {
  ...MERISIEL,
  build: {
    choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), 'boost:1:class:0': 'str' },
  },
};

function actionsSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-actions"]'));
}

function rowNames(root: HTMLElement): string[] {
  return [...actionsSection(root).querySelectorAll('pio-action-row')].map((row) =>
    textOf(present(row.querySelector('fr-text'))),
  );
}

async function press(root: HTMLElement, label: string): Promise<void> {
  const button = [...actionsSection(root).querySelectorAll('button')].find((candidate) => textOf(candidate) === label);
  present(button).click();
  await settle();
  render();
}

describe('CharacterSheetPage actions', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('lists on the Encounter tab what the character can do now, grouped by cost', async () => {
    const { root } = await openSheet(FIGHTER, { tab: SheetMode.Encounter, packs: PACKS });

    await vi.waitFor(() => {
      expect(rowNames(root)).toContain('Stride');
    });
    const names = rowNames(root);
    expect(names).toContain('Stand');
    expect(names).not.toContain('Earn Income');
    expect(
      [...actionsSection(root).querySelectorAll('h3')].map((heading) => textOf(heading)).slice(0, 1),
    ).toStrictEqual(['1 action']);
  });

  it('lists the downtime actions on the Downtime tab', async () => {
    const { root } = await openSheet(FIGHTER, { tab: SheetMode.Downtime, packs: PACKS });

    await vi.waitFor(() => {
      expect(rowNames(root)).toContain('Earn Income');
    });
    expect(rowNames(root)).not.toContain('Stride');
  });

  it('lists every action in the All view, with why the ones that cannot be used cannot', async () => {
    const { root } = await openSheet(FIGHTER, { tab: SheetMode.Encounter, packs: PACKS });
    await vi.waitFor(() => {
      expect(rowNames(root)).toContain('Stride');
    });

    await press(root, 'All');

    await vi.waitFor(() => {
      expect(textOf(actionsSection(root))).toContain('Earn Income');
    });
    expect(textOf(actionsSection(root))).toMatch(/Needs trained proficiency in/u);
  });

  it('rolls an action that rolls on the roll card, in one click', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: RANDOM_SOURCE, useValue: scriptedRandom([DieFace.parse(12)]) }],
    });
    const { root } = await openSheet(FIGHTER, { tab: SheetMode.Encounter, packs: PACKS });
    const button = await vi.waitFor(() =>
      present(actionsSection(root).querySelector<HTMLButtonElement>('button[aria-label^="Roll "]')),
    );

    button.click();
    await settle();
    render();

    expect(present(root.querySelector('pio-sheet-last-roll')).querySelector('pio-roll-card')).not.toBeNull();
  });
});
