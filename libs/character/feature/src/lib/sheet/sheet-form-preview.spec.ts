import { TestBed } from '@angular/core/testing';
import { Character, EffectInstanceId, InventorySchema, SELF } from '@pioneer/character/domain';
import type { ActiveEffect } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  ITEM_FIXTURE_FILES,
  ItemFixture,
  itemFixtureId,
  playerCoreClassId,
} from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentId, ContentKind, RollOption, SpellRank } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { cutTo } from '../testing/test-packs';
import { EQUIPMENT_CONTENT_KINDS } from './sheet-equipment';
import { sheetFormPreview } from './sheet-form-preview';

const KINDS = [...EQUIPMENT_CONTENT_KINDS, ContentKind.Action];
const PACKS = [...cutTo(KINDS), ITEM_FIXTURE_FILES];
const BLADE = '77777777-7777-4777-8777-777777777777';

/** Animal Form's Ape: a Large form with Strikes of its own. */
const APE = ContentId.parse('0864651a-fc5b-52be-99a6-6f40369fa731');
const PLANT = ContentId.parse('364d6d32-3a80-511d-95b1-952f32748076');
const CANDIDATE_ID = EffectInstanceId.parse('00000000-0000-4000-8000-000000000002');
const IN_FORM_ID = EffectInstanceId.parse('00000000-0000-4000-8000-000000000001');

function formOf(id: EffectInstanceId): ActiveEffect {
  return { id, effect: APE, source: SELF, rank: SpellRank.parse(4) };
}

/** A cleric holding a Hunter's Blade, with `effects` active. */
function clericWith(...effects: ActiveEffect[]): Character {
  const cleric = new CharacterBuilder().picking('class', playerCoreClassId('cleric')).build();
  const items = [
    { id: BLADE, item: itemFixtureId(ItemFixture.HuntersBlade), quantity: 1, carry: { state: 'held', hands: 1 } },
  ];
  const { document, version, createdAt, updatedAt } = cleric;
  const inventory = InventorySchema.parse({ items, coins: { pp: 0, gp: 0, sp: 0, cp: 0 } });
  return new Character({
    document: { ...document, inventory, play: { ...document.play, effects } },
    version,
    createdAt,
    updatedAt,
  });
}

async function registryOf(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting([], PACKS) });
  return TestBed.inject(ContentLoader).registry(KINDS);
}

describe(sheetFormPreview, () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('previews the size and the Strikes a form sets beside the character’s own', async () => {
    const registry = await registryOf();

    const { rows } = sheetFormPreview({
      registry,
      character: clericWith(),
      candidate: formOf(CANDIDATE_ID),
      translate: (key) => key,
    });

    const names = rows.map(({ name }) => name);
    expect(names).toContain('character.sheet.formPreview.size');
    const size = rows.find(({ name }) => name === 'character.sheet.formPreview.size');
    expect(size?.own).toMatch(/medium/u);
    expect(size?.form).toMatch(/large/u);
  });

  it('previews the Strikes a form replaces the character’s with', async () => {
    const registry = await registryOf();
    const flytrap: ActiveEffect = {
      ...formOf(CANDIDATE_ID),
      effect: PLANT,
      form: RollOption.parse('plant-form:flytrap'),
      rank: SpellRank.parse(6),
    };

    const { rows } = sheetFormPreview({
      registry,
      character: clericWith(),
      candidate: flytrap,
      translate: (key) => key,
    });

    const strikes = rows.find(({ name }) => name === 'character.sheet.formPreview.strikes');
    expect(strikes?.form).toBeDefined();
    expect(strikes?.form).not.toBe(strikes?.own);
  });

  it('shows the character’s own numbers outside the form it is in now', async () => {
    const registry = await registryOf();
    const outside = sheetFormPreview({
      registry,
      character: clericWith(),
      candidate: formOf(CANDIDATE_ID),
      translate: (key) => key,
    });

    const inForm = sheetFormPreview({
      registry,
      character: clericWith(formOf(IN_FORM_ID)),
      candidate: formOf(CANDIDATE_ID),
      translate: (key) => key,
    });

    expect(inForm.rows).toStrictEqual(outside.rows);
  });
});
