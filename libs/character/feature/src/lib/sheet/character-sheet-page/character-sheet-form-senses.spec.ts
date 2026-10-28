import { SheetMode } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';

/** Player Core's character kinds and the effects of Divine Mysteries. */
const PACKS = cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Action, ContentKind.Effect]);

const PLANT_FORM = '364d6d32-3a80-511d-95b1-952f32748076';
const FIRST = '00000000-0000-4000-8000-000000000001';

const flytrap = {
  revision: 1,
  play: {
    hp: { damage: 0, temp: 0 },
    effects: [{ id: FIRST, effect: PLANT_FORM, source: { kind: 'self' }, form: 'plant-form:flytrap', rank: 6 }],
  },
};

function sensesOf(root: HTMLElement): string {
  return root.querySelector('section[aria-labelledby="sheet-senses"]')?.textContent.replaceAll(/\s+/gu, ' ') ?? '';
}

describe('CharacterSheetPage form senses', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('lists the character’s senses with where each comes from', async () => {
    const { root } = await openSheet(MERISIEL, { tab: SheetMode.Encounter, packs: PACKS });

    await vi.waitFor(() => {
      expect(sensesOf(root)).toMatch(/Low-Light Vision \(precise\)/u);
    });
    expect(sensesOf(root)).not.toContain('Your own senses');
  });

  it('marks the senses a battle form gives as from the form, and offers the character’s own', async () => {
    const { root } = await openSheet(MERISIEL, { tab: SheetMode.Encounter, play: flytrap, packs: PACKS });

    await vi.waitFor(() => {
      expect(sensesOf(root)).toMatch(/Low-Light Vision \(precise\)\s*from [^;]*Plant Form/u);
      expect(sensesOf(root)).toContain('Your own senses');
    });
  });
});
