import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { PackId, packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { openFeatTable } from '../../testing/feat-table-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { cutTo, TEST_PACKS } from '../../testing/test-packs';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';

const FIGHTER_FEATS_PACK = 'fighter-feats';
const FIGHTER = ['fighter'];

const prerequisites = (text: string): object[] => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

/** Three 1st-level fighter feats: one without prerequisites, one a 1st-level fighter doesn't meet, one unparsed. */
const fighterFeats = new ContentPackBuilder()
  .withId(FIGHTER_FEATS_PACK)
  .withFeat('power-attack', { traits: FIGHTER })
  .withFeat('sudden-charge', {
    traits: FIGHTER,
    data: {
      prerequisites: prerequisites('expert in Athletics'),
      prerequisitePredicate: [{ gte: ['skill:athletics:rank', 2] }],
    },
  })
  .withFeat('reactive-shield', { traits: FIGHTER, data: { prerequisites: prerequisites('an animal companion') } })
  .build();

const FIGHTER_FEATS: PackContentsLoader = {
  id: PackId.parse(FIGHTER_FEATS_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles(
      { id: FIGHTER_FEATS_PACK, title: 'Fighter feats', publisher: 'Pioneer tests', license: 'homebrew' },
      [fighterFeats.otherEntries],
    ),
};
/** The packs the character specs read, with the fighter feats beside them: `packs` replaces the packs served. */
const FIGHTER_PACKS = [...TEST_PACKS, FIGHTER_FEATS];

const featId = (name: string): string => present(fighterFeats.otherEntries.find((entry) => entry.name === name)).id;
const POWER_ATTACK = featId('Power-attack');
const SUDDEN_CHARGE = featId('Sudden-charge');
/** Player Core's fighter's 1st-level class feat slot: the class and the rule index of its `ChoiceSet`. */
const FIGHTER_FEAT_1 = `${playerCoreClassId('fighter')}:27`;

/** Player Core with its feats, for the feats a feature grants. */
const FEAT_PACKS = cutTo(FEAT_CONTENT_KINDS);

/** Merisiel as a 1st-level fighter, with `choices` picked besides. */
function fighter(choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), ...choices } },
  };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function featsSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-feats"]'));
}

/** The feat slot labelled `label`, once it shows. */
async function slotNamed(root: HTMLElement, label: string): Promise<HTMLElement> {
  return vi.waitFor(() =>
    present(
      [...featsSection(root).querySelectorAll<HTMLElement>('fr-inline-field')].find(
        (field) => field.querySelector('fr-text')?.textContent.trim() === label,
      ),
    ),
  );
}

describe('CharacterSheetPage feats', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([], FIGHTER_PACKS);
    await prebuildServerStateTesting([], FEAT_PACKS);
  }, PREBUILD_TIMEOUT);

  // Skipped: the feat table renders no rows in this harness (#734).
  // oxlint-disable-next-line vitest/no-disabled-tests -- #734
  it.skip('offers each feat with whether its prerequisites are met: unmet ones shown but not pickable', async () => {
    const { root } = await openSheet(fighter(), { packs: FIGHTER_PACKS });
    const slot = await slotNamed(root, 'Fighter feat, level 1');

    const rows = await openFeatTable(slot, 3);

    expect(rows.map(({ name, disabled }) => [name, disabled])).toStrictEqual([
      ['Power-attack', false],
      ['Reactive-shield', false],
      ['Sudden-charge Prerequisites not met: expert in Athletics', true],
    ]);
    expect(rows[1]?.cells.join(' ')).toContain("Can't be checked: an animal companion");
    expect(rows[2]?.cells.join(' ')).toContain('Not met: expert in Athletics');
  });

  // Skipped: the feat table renders no rows in this harness (#734).
  // oxlint-disable-next-line vitest/no-disabled-tests -- #734
  it.skip('picks a feat whose prerequisites are met', async () => {
    const { root } = await openSheet(fighter(), { packs: FIGHTER_PACKS });
    const slot = await slotNamed(root, 'Fighter feat, level 1');
    const rows = await openFeatTable(slot, 3);

    present(rows.find((row) => row.name === 'Power-attack')).pick();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: FIGHTER_FEAT_1, selection: POWER_ATTACK },
    });
  });

  it('flags a taken feat whose prerequisites stop holding at its slot, with the reason', async () => {
    const taken = {
      status: 'invalid',
      key: FIGHTER_FEAT_1,
      subject: { kind: 'choice', entry: playerCoreClassId('fighter'), entryName: 'Fighter' },
      selection: SUDDEN_CHARGE,
      reason: { key: 'rules.choices.invalid.prerequisitesNotMet' },
    };
    const { root } = await openSheet(fighter({ [FIGHTER_FEAT_1]: SUDDEN_CHARGE }), {
      slots: [taken],
      packs: FIGHTER_PACKS,
    });

    const slot = await slotNamed(root, 'Fighter feat, level 1');

    await vi.waitFor(() => {
      expect(textOf(slot)).toContain('Sudden-charge');
    });
    expect(textOf(slot)).toContain("The character doesn't meet this feat's prerequisites at its level.");
  });

  it('lists the feats a feature grants with what gave them: a fighter’s Shield Block', async () => {
    const { root } = await openSheet(fighter(), { packs: FEAT_PACKS });

    await vi.waitFor(() => {
      const granted = [...featsSection(root).querySelectorAll('fr-list-item')].map((item) =>
        [...item.querySelectorAll('fr-text')].map((text) => textOf(text)),
      );
      expect(granted).toStrictEqual([['Shield Block', 'From Shield Block']]);
    });
  });

  it('groups the feats by slot type with the level taken at and a display category', async () => {
    const { root } = await openSheet(fighter({ [FIGHTER_FEAT_1]: POWER_ATTACK }), { packs: FIGHTER_PACKS });

    await vi.waitFor(() => {
      const headings = [...featsSection(root).querySelectorAll('fr-heading')].map((heading) => textOf(heading));
      expect(headings).toContain('Skill feats');
    });
    const row = present(
      [...featsSection(root).querySelectorAll('fr-list-item')].find((item) => textOf(item).includes('Power-attack')),
    );
    expect(textOf(row)).toBe('Level 1Power-attackNarrative');
  });
});
