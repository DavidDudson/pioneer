import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { PackId, packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { TEST_PACKS } from '../../testing/test-packs';

const DISPLAY_PACK = 'feat-display';

const built = new ContentPackBuilder()
  .withId(DISPLAY_PACK)
  .withFeat('power-attack', { traits: ['fighter'] })
  .withFeat('weapon-training', { traits: ['fighter'] })
  .build();
const POWER_ATTACK = present(built.otherEntries.find((entry) => entry.name === 'Power-attack')).id;
const WEAPON_TRAINING = present(built.otherEntries.find((entry) => entry.name === 'Weapon-training')).id;

/** Weapon Training only grants Power Attack: a grant-only feat. */
Object.assign(present(built.otherEntries.find((entry) => entry.id === WEAPON_TRAINING)), {
  rules: [{ key: 'GrantItem', item: POWER_ATTACK }],
});

const DISPLAY_PACKS_LOADER: PackContentsLoader = {
  id: PackId.parse(DISPLAY_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles(
      { id: DISPLAY_PACK, title: 'Feat display', publisher: 'Pioneer tests', license: 'homebrew' },
      [built.otherEntries],
    ),
};
const PACKS = [...TEST_PACKS, DISPLAY_PACKS_LOADER];

/** Player Core's fighter's 1st-level class feat slot: the class and the rule index of its `ChoiceSet`. */
const FIGHTER_FEAT_1 = `${playerCoreClassId('fighter')}:31`;

/** Merisiel as a 1st-level fighter who took Weapon Training. */
const FIGHTER = {
  ...MERISIEL,
  build: {
    choices: {
      ...MERISIEL.build.choices,
      class: playerCoreClassId('fighter'),
      [FIGHTER_FEAT_1]: WEAPON_TRAINING,
    },
  },
};

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function featsSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-feats"]'));
}

function rows(root: HTMLElement): string[] {
  return [...featsSection(root).querySelectorAll('fr-list-item')].map((item) => textOf(item));
}

const TOGGLE = 'Show feats that only grant something else';

function toggleOf(root: HTMLElement): HTMLButtonElement {
  return present(
    [...featsSection(root).querySelectorAll<HTMLButtonElement>('fr-toggle-button button')].find((button) =>
      textOf(button).includes(TOGGLE),
    ),
  );
}

describe('CharacterSheetPage feat display', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('hides a feat that only grants another, whose product says where it is from', async () => {
    const { root } = await openSheet(FIGHTER, { packs: PACKS });

    await vi.waitFor(() => {
      expect(rows(root).join('|')).toContain('Power-attack');
    });
    expect(rows(root).filter((row) => row.includes('Grants only'))).toStrictEqual([]);
    expect(rows(root).find((row) => row.includes('Power-attack'))).toContain('From Weapon-training');
  });

  it('shows it again when the user chooses, and remembers the choice for the section', async () => {
    const { root } = await openSheet(FIGHTER, { packs: PACKS });
    await vi.waitFor(() => {
      expect(featsSection(root).querySelector('fr-toggle-button')).not.toBeNull();
    });

    toggleOf(root).click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}/feat-display` }),
    );
    expect(request.request.body).toStrictEqual({ section: 'feats', showGrantOnly: true });
    await vi.waitFor(() => {
      expect(rows(root).filter((row) => row.startsWith('Level 1Weapon-training'))).toStrictEqual([
        'Level 1Weapon-trainingGrants only',
      ]);
    });
  });
});
