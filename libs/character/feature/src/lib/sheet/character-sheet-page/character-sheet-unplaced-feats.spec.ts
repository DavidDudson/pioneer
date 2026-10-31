import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { TEST_PACKS } from '../../testing/test-packs';

const FEATS_PACK = 'unplaced-feats';

const feats = new ContentPackBuilder()
  .withId(FEATS_PACK)
  .withFeat('power-attack', { traits: ['fighter'] })
  .build();

const FEATS: PackContentsLoader = {
  id: PackId.parse(FEATS_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles(
      { id: FEATS_PACK, title: 'Unplaced feats', publisher: 'Pioneer tests', license: 'homebrew' },
      [feats.otherEntries],
    ),
};
const PACKS = [...TEST_PACKS, FEATS];

const POWER_ATTACK = present(feats.otherEntries.find((entry) => entry.name === 'Power-attack')).id;

/** Merisiel as a fighter who carries `unplacedFeats` the import found no slot for. */
function fighter(unplacedFeats: readonly string[]): object {
  return {
    ...MERISIEL,
    build: {
      choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter') },
      unplacedFeats,
    },
  };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function featsSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-feats"]'));
}

describe('CharacterSheetPage feats with no slot', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('flags an imported feat no slot offers, by name, with the rule it breaks', async () => {
    const { root } = await openSheet(fighter([POWER_ATTACK]), { packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(featsSection(root))).toContain('Feats with no slot');
    });
    expect(textOf(featsSection(root))).toContain('Power-attack');
    expect(textOf(featsSection(root))).toContain(
      'No slot offers this feat, so it was kept as imported and breaks a rule.',
    );
  });

  it('counts the flagged feats in the sheet header', async () => {
    const { root } = await openSheet(fighter([POWER_ATTACK]), { packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(root)).toContain('1 item breaks a rule');
    });
  });

  it('lists nothing when every imported feat has a slot', async () => {
    const { root } = await openSheet(fighter([]), { packs: PACKS });

    await vi.waitFor(() => {
      expect(featsSection(root).querySelector('fr-inline-field, fr-empty-state')).not.toBeNull();
    });
    expect(textOf(featsSection(root))).not.toContain('Feats with no slot');
  });

  it('dismisses a flagged feat with a dismissUnplacedFeat patch', async () => {
    const { root } = await openSheet(fighter([POWER_ATTACK]), { packs: PACKS });
    const dismiss = await vi.waitFor(() =>
      present(featsSection(root).querySelector<HTMLElement>('fr-async-button button[aria-label^="Dismiss"]')),
    );

    dismiss.click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({ patch: { field: 'dismissUnplacedFeat', feat: POWER_ATTACK } });
  });
});
